"""Queue concurrency, crash/retry and privilege scenarios against real PostgreSQL."""
import concurrent.futures
import json
import time


def run_scenarios(*, query, check, Session, report):
    auth = '00000000-0000-0000-0000-000000000001'
    case = '10000000-0000-0000-0000-000000000001'
    received = '2026-01-02T00:00:00Z'
    def lit(value):
        if value is None: return 'NULL'
        if isinstance(value, bool): return 'true' if value else 'false'
        return "'" + str(value).replace("'", "''") + "'"
    def scalar(sql): return query(sql).stdout.strip()
    def rpc(name, *args, session=None):
        sql = 'SET ROLE service_role; SELECT jurispurama.' + name + '(' + ','.join(map(lit, args)) + '); RESET ROLE;'
        output = session.execute(sql) if session else scalar(sql)
        if not output: return None
        if output in ('t', 'f'): return output == 't'
        return json.loads(output)
    def passed(name, **facts): report['checks'].append({'case': name, 'pass': True, **facts})
    def reset(count=1):
        query(f"""TRUNCATE auth.users CASCADE;
          INSERT INTO auth.users(id,email) VALUES('{auth}','queue-test@example.invalid');
          INSERT INTO jurispurama.jurispurama_cases(id,user_id,type)
            SELECT '{case}',id,'test' FROM jurispurama.jurispurama_users WHERE auth_user_id='{auth}';
          INSERT INTO jurispurama.jurispurama_documents(id,case_id,type,title,sent_status,sent_at,tracking_number,created_at)
            SELECT md5('doc-'||i)::uuid,'{case}','test','Synthetic document '||i,'sent_recommande','2026-01-01', (1000+i)::text,'2025-12-01'
            FROM generate_series(1,{count}) i;""")
        rpc('ar24_sync_tracking')
    def finish(claim, receipt=None, error=None):
        return rpc('ar24_complete_tracking', claim['document_id'], claim['lease_token'], receipt, error)
    def queued():
        reset(); claim = rpc('ar24_claim_tracking'); check(finish(claim, received)['persisted']); return rpc('ar24_claim_notification')
    def body(email='queue-test@example.invalid', subject='Receipt'):
        return json.dumps({'from': 'JurisPurama <notifications@purama.dev>', 'to': [email], 'subject': subject,
            'html': '<p>Statut de suivi, pas preuve archivée.</p>', 'reply_to': 'support@example.invalid'}, ensure_ascii=False, separators=(',', ':'))
    def begin(event, payload=None): return rpc('ar24_begin_notification', event['id'], event['lease_token'], payload or body())
    def expire_lease(table): query(f'UPDATE jurispurama.{table} SET lease_until=clock_timestamp()-interval \'1 second\';')

    reset(205)
    dates = scalar('SELECT md5(string_agg(sent_at::text||created_at::text,\',\' ORDER BY id)) FROM jurispurama.jurispurama_documents;')
    seen = []
    for _ in range(200):
        claim = rpc('ar24_claim_tracking'); check(claim is not None); seen.append(claim['document_id'])
        check(finish(claim, error='persistent_provider_failure')['rescheduled'])
    # Seed again, as on a process restart: priorities of the failing first 200 must survive.
    check(rpc('ar24_sync_tracking') == 0)
    remaining = []
    for _ in range(5):
        claim = rpc('ar24_claim_tracking'); remaining.append(claim['document_id']); check(finish(claim)['rescheduled'])
    check(len(set(seen + remaining)) == 205)
    check(rpc('ar24_claim_tracking') is None)
    check(dates == scalar('SELECT md5(string_agg(sent_at::text||created_at::text,\',\' ORDER BY id)) FROM jurispurama.jurispurama_documents;'))
    passed('205_documents_error_backlog_and_restart_preserve_fairness', first_invocation=200, next_invocation=5, business_dates_unchanged=True)

    reset(2)
    first, second = Session('ar24_claim_first'), Session('ar24_claim_second')
    first.execute('BEGIN;'); a = rpc('ar24_claim_tracking', session=first)
    second.execute('BEGIN;'); b = rpc('ar24_claim_tracking', session=second)
    check(a['document_id'] != b['document_id']); second.execute('COMMIT;'); first.execute('COMMIT;')
    check(rpc('ar24_claim_tracking') is None)
    first.close(); second.close()
    passed('concurrent_uncommitted_claims_skip_locked_and_never_share_document', real_overlapping_transactions=True)

    reset(1)
    crash = Session('ar24_uncommitted_crash'); crash.execute('BEGIN;'); rolled = rpc('ar24_claim_tracking', session=crash); crash.close(crash=True)
    claim = rpc('ar24_claim_tracking'); check(claim['document_id'] == rolled['document_id'])
    check(rpc('ar24_claim_tracking') is None)
    expire_lease('ar24_tracking_state'); replacement = rpc('ar24_claim_tracking')
    check(replacement['lease_token'] != claim['lease_token']); check(finish(claim, received) is None)
    check(finish(replacement)['rescheduled'])
    passed('crash_rollback_and_expired_committed_lease_recover_with_fencing')

    reset(); claim = rpc('ar24_claim_tracking')
    query("UPDATE jurispurama.jurispurama_documents SET tracking_number='2002';")
    check(finish(claim, received) is None); rpc('ar24_sync_tracking')
    replacement = rpc('ar24_claim_tracking'); check(replacement['tracking_number'] == '2002')
    check(finish(claim, received) is None); check(finish(replacement, received)['persisted'])
    passed('changed_deposit_snapshot_invalidates_old_completion')

    reset(); claim = rpc('ar24_claim_tracking')
    # A deliberate local notification failure must roll back receipt AND outbox.
    query("ALTER TABLE jurispurama.jurispurama_notifications ADD CONSTRAINT reject_test_notification CHECK(type <> 'ar_received');")
    result = query(f"SET ROLE service_role; SELECT jurispurama.ar24_complete_tracking('{claim['document_id']}','{claim['lease_token']}','{received}',NULL);", expect_error=True)
    check(result.returncode != 0 and '23514' in result.stderr)
    check(scalar('SELECT count(*) FROM jurispurama.jurispurama_documents WHERE ar_received_at IS NOT NULL;') == '0')
    check(scalar('SELECT count(*) FROM jurispurama.ar24_notification_outbox;') == '0')
    check(scalar('SELECT count(*) FROM jurispurama.jurispurama_messages;') == '0')
    query('ALTER TABLE jurispurama.jurispurama_notifications DROP CONSTRAINT reject_test_notification;')
    check(finish(claim, received)['persisted'])
    check(finish(claim, received) is None)
    check(scalar('SELECT (SELECT count(*) FROM jurispurama.ar24_notification_outbox)||\',\'||(SELECT count(*) FROM jurispurama.jurispurama_notifications)||\',\'||(SELECT count(*) FROM jurispurama.jurispurama_messages);') == '1,1,1')
    # No email call happened; restarting a worker still sees the transactional event.
    event = rpc('ar24_claim_notification'); check(event is not None)
    passed('receipt_message_local_notification_outbox_commit_atomically_and_replay_once')

    payload = body(); prepared = begin(event, payload)
    check(prepared['payload'] == payload)
    first_time = scalar('SELECT first_attempt_at FROM jurispurama.ar24_notification_outbox;')
    # Crash after provider may have accepted, but before local acknowledgement.
    expire_lease('ar24_notification_outbox'); resumed = rpc('ar24_claim_notification')
    replay = begin(resumed, body(subject='Changed by a later deployment'))
    check(replay == prepared)
    check(first_time == scalar('SELECT first_attempt_at FROM jurispurama.ar24_notification_outbox;'))
    check(not rpc('ar24_finish_notification', event['id'], event['lease_token'], 'provider-original', False))
    check(rpc('ar24_finish_notification', resumed['id'], resumed['lease_token'], 'provider-original', False))
    check(rpc('ar24_claim_notification') is None)
    passed('lost_email_ack_replays_exact_body_key_window_and_fences_old_worker', provider_called=False)

    event = queued(); prepared = begin(event)
    query("UPDATE jurispurama.ar24_notification_outbox SET first_attempt_at=clock_timestamp()-interval '23 hours',lease_until=clock_timestamp()-interval '1 second';")
    check(rpc('ar24_claim_notification') is None)
    check(scalar("SELECT state||':'||last_error FROM jurispurama.ar24_notification_outbox;") == 'reconcile:idempotency_window_expired')
    check(begin(event) is None)
    passed('uncertain_email_after_23_hours_requires_reconciliation_without_new_key')

    event = queued(); begin(event)
    query("UPDATE jurispurama.jurispurama_users SET email='changed@example.invalid';")
    check(begin(event) is None)
    check(scalar('SELECT state FROM jurispurama.ar24_notification_outbox;') == 'reconcile')
    passed('recipient_change_after_first_attempt_never_retargets_same_key')

    event = queued()
    query(f"INSERT INTO jurispurama.account_deletion_requests(user_id,scheduled_for,status) VALUES('{auth}',now(),'executing');")
    check(begin(event) is None)
    expire_lease('ar24_notification_outbox'); check(rpc('ar24_claim_notification') is None)
    check(scalar('SELECT state FROM jurispurama.ar24_notification_outbox;') == 'cancelled')
    check(rpc('ar24_queue_status')['email_due'] == 0)
    passed('executing_account_deletion_blocks_preparation_and_new_claims')

    for change, name in [("UPDATE jurispurama.jurispurama_documents SET deleted_at=now();", 'soft_deleted_document'),
            ("INSERT INTO auth.users(id,email) VALUES('00000000-0000-0000-0000-000000000002','other@example.invalid'); UPDATE jurispurama.jurispurama_cases SET user_id=(SELECT id FROM jurispurama.jurispurama_users WHERE email='other@example.invalid');", 'reassigned_case')]:
        event = queued(); query(change); check(begin(event) is None)
        expire_lease('ar24_notification_outbox'); check(rpc('ar24_claim_notification') is None)
        check(scalar('SELECT state FROM jurispurama.ar24_notification_outbox;') == 'cancelled')
        check(rpc('ar24_queue_status')['email_due'] == 0)
        passed(name + '_cancels_without_permanent_due_metric')

    event = queued(); begin(event)
    query(f"DELETE FROM auth.users WHERE id='{auth}';")
    check(begin(event) is None); check(not rpc('ar24_finish_notification', event['id'], event['lease_token'], 'late-provider-id', False))
    for table in ('ar24_tracking_state', 'ar24_notification_outbox', 'jurispurama_documents', 'jurispurama_notifications', 'jurispurama_messages'):
        check(scalar(f'SELECT count(*) FROM jurispurama.{table};') == '0')
    passed('auth_user_deletion_cascades_private_payload_and_rejects_late_ack')

    reset(); query(f"UPDATE jurispurama.jurispurama_documents SET ar_received_at='{received}'; DELETE FROM jurispurama.ar24_tracking_state;")
    rpc('ar24_sync_tracking'); check(rpc('ar24_claim_tracking') is None); check(rpc('ar24_claim_notification') is None)
    passed('historical_receipts_without_delivery_evidence_are_not_auto_replayed')

    event = queued()
    # Schema.sql's real permissive default ACLs are present; prove explicit revokes.
    for role in ('anon', 'authenticated'):
        for table in ('ar24_tracking_state', 'ar24_notification_outbox'):
            for privilege in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'):
                check(scalar(f"SELECT has_table_privilege('{role}','jurispurama.{table}','{privilege}');") == 'f')
        check(scalar(f"SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='jurispurama' AND p.proname LIKE 'ar24_%' AND has_function_privilege('{role}',p.oid,'EXECUTE');") == '0')
        check(query(f'SET ROLE {role}; SELECT jurispurama.ar24_claim_notification();', expect_error=True).returncode != 0)
        check(query(f'SET ROLE {role}; TRUNCATE jurispurama.ar24_notification_outbox;', expect_error=True).returncode != 0)
        # Even an accidental SELECT grant remains default-deny RLS.
        query(f'GRANT SELECT ON jurispurama.ar24_notification_outbox TO {role};')
        check(scalar(f'SET ROLE {role}; SELECT count(*) FROM jurispurama.ar24_notification_outbox;') == '0')
        query(f'REVOKE SELECT ON jurispurama.ar24_notification_outbox FROM {role};')
    check(scalar("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='jurispurama' AND p.proname LIKE 'ar24_%' AND p.prosecdef;") == '0')
    passed('actual_permissive_defaults_are_revoked_and_rls_is_default_deny', table_privilege_checks=28, role_function_denials=2, truncate_denials=2, rls_denials=2)

    # Observe real lock waits, not just two sequential calls or a simulated SDK.
    def blocks_change(held_sql, change_sql):
        lock = Session('ar24_owner_lock_' + str(len(report['checks'])))
        other = Session('ar24_owner_change_' + str(len(report['checks'])))
        lock.execute('BEGIN; ' + held_sql)
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(other.execute, change_sql)
            try:
                deadline = time.monotonic() + 4
                while time.monotonic() < deadline:
                    if scalar(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{other.label}' AND wait_event_type='Lock';") == '1': break
                    check(not future.done(), 'Expected PostgreSQL lock overlap not observed'); time.sleep(0.01)
                else: raise AssertionError('Lock wait not observed')
            finally: lock.execute('COMMIT;')
            future.result(timeout=5)
        lock.close(); other.close()
    event = queued()
    args = ','.join(map(lit, [event['id'], event['lease_token'], body()]))
    blocks_change(f'SET ROLE service_role; SELECT jurispurama.ar24_begin_notification({args});',
        "UPDATE jurispurama.jurispurama_users SET email='changed@example.invalid';")
    check(begin(event) is None)
    passed('email_change_waits_for_preparation_transaction_and_retry_detects_change', lock_wait_observed=True)
    event = queued()
    args = ','.join(map(lit, [event['id'], event['lease_token'], body()]))
    blocks_change(f'SET ROLE service_role; SELECT jurispurama.ar24_begin_notification({args});',
        'UPDATE jurispurama.jurispurama_documents SET deleted_at=now();')
    check(begin(event) is None)
    passed('soft_delete_waits_for_preparation_transaction_then_blocks_later_attempt', lock_wait_observed=True)

    reset(); claim = rpc('ar24_claim_tracking')
    second_case = '10000000-0000-0000-0000-000000000002'
    query(f"INSERT INTO jurispurama.jurispurama_cases(id,user_id,type) SELECT '{second_case}',id,'test' FROM jurispurama.jurispurama_users;")
    mover, worker = Session('ar24_document_mover'), Session('ar24_waiting_completion')
    mover.execute(f"BEGIN; UPDATE jurispurama.jurispurama_documents SET case_id='{second_case}' WHERE id='{claim['document_id']}';")
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(rpc, 'ar24_complete_tracking', claim['document_id'], claim['lease_token'], received, None, session=worker)
        try:
            deadline = time.monotonic() + 4
            while time.monotonic() < deadline:
                if scalar("SELECT count(*) FROM pg_stat_activity WHERE application_name='ar24_waiting_completion' AND wait_event_type='Lock';") == '1': break
                check(not future.done(), 'Completion did not overlap document move'); time.sleep(0.01)
            else: raise AssertionError('Document lock wait not observed')
        finally: mover.execute('COMMIT;')
        check(future.result(timeout=5) is None)
    check(scalar('SELECT count(*) FROM jurispurama.jurispurama_documents WHERE ar_received_at IS NOT NULL;') == '0')
    check(scalar('SELECT count(*) FROM jurispurama.ar24_notification_outbox;') == '0')
    mover.close(); worker.close()
    passed('concurrent_document_move_is_revalidated_after_waiting_for_document_lock', lock_wait_observed=True)
