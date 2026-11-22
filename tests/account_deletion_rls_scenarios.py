"""Native RLS scenarios; called only inside the runner's new private cluster.

The role grants here are synthetic fixtures, never part of the migration.
No connection parameters, credentials, subprocess or server lifecycle live here.
"""
import hashlib
import json


def run_rls_scenarios(*, query, check, report, migration_sql, blocked_then_commit):
    table = 'jurispurama.account_deletion_requests'
    owner_user = '00000000-0000-0000-0000-000000000001'
    other_user = '00000000-0000-0000-0000-000000000002'
    request_id = '10000000-0000-0000-0000-000000000001'
    due = '2026-11-10T12:00:00Z'
    future = '2026-12-11T12:00:00Z'
    statuses = ('scheduled', 'cancelled', 'executing', 'completed')
    mutable = ('scheduled', 'cancelled')
    guard_names = (
        'account_deletion_requests_insert_state_guard',
        'account_deletion_requests_update_state_guard',
        'account_deletion_requests_delete_state_guard',
    )
    names_sql = ','.join("'" + name + "'" for name in guard_names)
    evidence = {'status': 'FAILED', 'checks': [], 'production_exposure_tested': False}
    report['rls'] = evidence

    def record(name, **details):
        evidence['checks'].append({'case': name, 'pass': True, **details})

    def scalar(sql):
        return query(sql).stdout.strip()

    def as_role(sql, role='authenticated', uid=owner_user, expect_error=False):
        check(role in ('authenticated', 'rls_probe', 'service_role'), 'Unexpected fixture role')
        check(uid in (owner_user, other_user, ''), 'Unexpected synthetic identity')
        # This emulates the SQL role + claim context, not authentication/JWT validation.
        return query(
            f"BEGIN; SET LOCAL ROLE {role}; "
            f"SET LOCAL \"request.jwt.claim.sub\" = '{uid}';\n{sql}\nCOMMIT;",
            expect_error=expect_error,
        )

    def seed(status=None, uid=owner_user):
        check(status is None or status in statuses, 'Unexpected seed state')
        check(uid in (owner_user, other_user), 'Unexpected seed owner')
        query(f"TRUNCATE auth.users CASCADE; INSERT INTO auth.users(id) VALUES ('{owner_user}'),('{other_user}');")
        if status is not None:
            query(f"INSERT INTO {table}(id,user_id,scheduled_for,status) "
                  f"VALUES('{request_id}','{uid}','{due}','{status}');")

    def stored():
        return scalar(f"SELECT status FROM {table} ORDER BY id;")

    def insert_sql(status, uid=owner_user):
        return (f"INSERT INTO {table}(user_id,scheduled_for,status) "
                f"VALUES('{uid}','{future}','{status}') RETURNING status;")

    def expect_state_error(result, state, label):
        check(result.returncode != 0 and state in result.stderr,
              f'{label}: expected SQLSTATE {state}, got {result.returncode}: {result.stderr}')

    def policies(guards=False):
        op = 'IN' if guards else 'NOT IN'
        return scalar(f"SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY polname),'[]'::jsonb) "
                      f"FROM pg_policy p WHERE polrelid='{table}'::regclass AND polname {op} ({names_sql});")

    def roles_and_grants():
        return scalar(
            "SELECT jsonb_build_object('roles',(SELECT jsonb_agg(jsonb_build_object("
            "'name',rolname,'super',rolsuper,'bypass',rolbypassrls,'create_role',rolcreaterole,"
            "'login',rolcanlogin) ORDER BY rolname) FROM pg_roles "
            "WHERE rolname IN ('authenticated','service_role','rls_probe')),"
            f"'table_acl',(SELECT relacl::text FROM pg_class WHERE oid='{table}'::regclass));"
        )

    # The runner has already verified ownership of its just-initialized server.
    query("CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEROLE NOBYPASSRLS; "
          "CREATE ROLE rls_probe NOLOGIN NOSUPERUSER NOCREATEROLE NOBYPASSRLS; "
          "CREATE ROLE service_role NOLOGIN NOSUPERUSER NOCREATEROLE BYPASSRLS;")
    query("GRANT USAGE ON SCHEMA auth, jurispurama TO authenticated, rls_probe, service_role; "
          f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO authenticated, rls_probe, service_role; "
          "GRANT SELECT, DELETE ON auth.users TO service_role;")
    for role, active in (('authenticated', 't'), ('rls_probe', 't'), ('service_role', 'f')):
        observed = as_role(f"SELECT current_user, row_security_active('{table}');", role=role).stdout.strip()
        check(observed == f'{role}|{active}', f'Unexpected RLS role context: {observed}')
    evidence['roles'] = json.loads(roles_and_grants())['roles']
    record('synthetic_clients_are_not_owner_or_bypass_service_role_bypasses')

    def matrix(stage):
        guarded = stage == 'after'
        for state in statuses:
            seed()
            result = as_role(insert_sql(state), expect_error=True)
            allowed = not guarded or state == 'scheduled'
            if allowed:
                check(result.returncode == 0 and result.stdout.strip() == state, result.stderr)
                check(stored() == state, 'Unexpected inserted state')
            else:
                expect_state_error(result, '42501', f'{stage} insert {state}')
                check(stored() == '', 'Rejected insert created a row')
            record(f'{stage}_insert_{state}', result='accepted' if allowed else '42501')
        for old in statuses:
            for new in statuses:
                seed(old)
                result = as_role(f"UPDATE {table} SET status='{new}' "
                                 f"WHERE user_id='{owner_user}' RETURNING status;", expect_error=True)
                if not guarded or (old in mutable and new in mutable):
                    check(result.returncode == 0 and result.stdout.strip() == new, result.stderr)
                    check(stored() == new, 'Accepted update did not persist expected state')
                    outcome = 'accepted'
                elif old not in mutable:
                    check(result.returncode == 0 and result.stdout.strip() == '', result.stderr)
                    check(stored() == old, 'Protected old state changed')
                    outcome = 'zero_rows'
                else:
                    expect_state_error(result, '42501', f'{stage} {old}->{new}')
                    check(stored() == old, 'Rejected update changed the row')
                    outcome = '42501'
                record(f'{stage}_update_{old}_to_{new}', result=outcome)

    matrix('before')
    evidence['baseline'] = 'Synthetic granted non-owner can enter/leave all four states under versioned own-only policies.'

    def rejected_migration(name, setup, restore, expected_message):
        query(setup)
        policies_before = policies(guards=True)
        originals_before = policies()
        access_before = roles_and_grants()
        try:
            result = query(migration_sql, expect_error=True)
            expect_state_error(result, 'P0001', name)
            check(expected_message in result.stderr, f'Wrong rejection reason: {result.stderr}')
            check(policies(guards=True) == policies_before, 'Failed migration changed guard policies')
            check(policies() == originals_before, 'Failed migration changed original policies')
            check(roles_and_grants() == access_before, 'Failed migration changed roles or grants')
        finally:
            query(restore)
        record(name, result='P0001; catalog unchanged')

    rejected_migration(
        'preflight_rejects_service_role_without_bypass',
        'ALTER ROLE service_role NOBYPASSRLS;', 'ALTER ROLE service_role BYPASSRLS;',
        'service_role must already have BYPASSRLS',
    )
    rejected_migration(
        'preflight_rejects_disabled_rls',
        f'ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;',
        f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;',
        'expected ordinary RLS table',
    )
    rejected_migration(
        'preflight_rejects_missing_column',
        f'ALTER TABLE {table} RENAME COLUMN scheduled_for TO fixture_scheduled_for;',
        f'ALTER TABLE {table} RENAME COLUMN fixture_scheduled_for TO scheduled_for;',
        'incompatible column scheduled_for',
    )
    rejected_migration(
        'preflight_rejects_authenticated_truncate',
        f'GRANT TRUNCATE ON {table} TO authenticated;',
        f'REVOKE TRUNCATE ON {table} FROM authenticated;',
        'authenticated can bypass row policies',
    )
    rejected_migration(
        'preflight_rejects_altered_original_policy',
        f'ALTER POLICY account_deletion_requests_update_own ON {table} USING (true);',
        f'ALTER POLICY account_deletion_requests_update_own ON {table} USING (auth.uid() = user_id);',
        'unexpected or absent original policy account_deletion_requests_update_own',
    )
    rejected_migration(
        'collision_rejects_permissive_guard_without_replacement',
        f'CREATE POLICY {guard_names[0]} ON {table} AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (true);',
        f'DROP POLICY {guard_names[0]} ON {table};',
        'RLS guard collision',
    )
    rejected_migration(
        'collision_rolls_back_preceding_policy_creations',
        f'CREATE POLICY {guard_names[2]} ON {table} AS RESTRICTIVE FOR DELETE TO PUBLIC USING (true);',
        f'DROP POLICY {guard_names[2]} ON {table};',
        'RLS guard collision',
    )
    check(policies(guards=True) == '[]', 'Rejection fixtures left guard policies behind')
    # Restore operations above may recreate an ACL representation; compare the
    # migration against the immediate pre-migration catalog, not fixture DDL.
    original_policies = policies()
    original_access = roles_and_grants()
    query(migration_sql)
    after_guards = policies(guards=True)
    check(len(json.loads(after_guards)) == 3, 'Expected exactly three new guards')
    check(policies() == original_policies, 'Migration replaced or modified an original policy')
    check(roles_and_grants() == original_access, 'Migration changed roles or table grants')
    record('migration_adds_three_guards_preserves_original_policies_roles_and_grants')

    query(migration_sql)
    check(policies(guards=True) == after_guards, 'Replay modified policy definitions or identities')
    check(policies() == original_policies and roles_and_grants() == original_access,
          'Replay changed original policies or privileges')
    record('migration_is_idempotent_without_policy_replacement')
    evidence['guard_catalog_sha256'] = hashlib.sha256(after_guards.encode()).hexdigest()

    matrix('after')

    seed('scheduled', uid=other_user)
    check(as_role(f'SELECT id FROM {table};').stdout.strip() == '', 'Other account is visible')
    check(as_role(f"UPDATE {table} SET status='cancelled' RETURNING id;").stdout.strip() == '',
          'Other account can be updated')
    check(stored() == 'scheduled', 'Other account state changed')
    seed()
    expect_state_error(as_role(insert_sql('scheduled', other_user), expect_error=True), '42501', 'Other-user insert')
    expect_state_error(as_role(insert_sql('scheduled'), uid='', expect_error=True), '42501', 'No-identity insert')
    record('ownership_and_missing_identity_are_enforced')

    # Current e5fb2a3d POST: SELECT then conditional mutation using exactly the
    # previously observed id/user/status/deadline; DELETE HTTP is an UPDATE.
    seed()
    check(as_role(insert_sql('scheduled')).stdout.strip() == 'scheduled', 'SSR first schedule failed')
    check(as_role(f"UPDATE {table} SET status='cancelled',cancelled_at=now() "
                  f"WHERE user_id='{owner_user}' AND status='scheduled' RETURNING id;").stdout.strip() != '',
          'SSR cancellation failed')
    selected = as_role(f"SELECT id, status, scheduled_for::text FROM {table} WHERE user_id='{owner_user}';").stdout.strip().split('|')
    check(len(selected) == 3 and selected[1] == 'cancelled', 'SSR lookup failed')
    reschedule = (f"UPDATE {table} SET user_id='{owner_user}',status='scheduled',scheduled_for='{future}',"
                  f"reason=NULL,cancelled_at=NULL,completed_at=NULL WHERE id='{selected[0]}' "
                  f"AND user_id='{owner_user}' AND status='{selected[1]}' "
                  f"AND scheduled_for='{selected[2]}' RETURNING status;")
    check(as_role(reschedule).stdout.strip() == 'scheduled', 'SSR conditional reschedule failed')
    record('current_ssr_schedule_cancel_lookup_and_conditional_reschedule_work')

    seed('scheduled')
    claim = (f"UPDATE {table} SET status='executing' WHERE id='{request_id}' "
             f"AND user_id='{owner_user}' AND status='scheduled' AND scheduled_for='{due}' "
             "AND scheduled_for<='2026-11-11T12:00:00Z' RETURNING id;")
    check(as_role(claim, role='service_role', uid='').stdout.strip() == request_id, 'Service claim failed')
    stale = (f"UPDATE {table} SET status='scheduled',scheduled_for='{future}',reason=NULL,"
             f"cancelled_at=NULL,completed_at=NULL WHERE id='{request_id}' AND user_id='{owner_user}' "
             f"AND status='scheduled' AND scheduled_for='{due}' RETURNING id;")
    check(as_role(stale).stdout.strip() == '', 'SSR stale schedule overwrote service claim')
    check(as_role(f"UPDATE {table} SET status='cancelled' WHERE user_id='{owner_user}' "
                  "AND status='scheduled' RETURNING id;").stdout.strip() == '', 'SSR cancellation overwrote claim')
    check(as_role(f"SELECT status FROM {table} WHERE user_id='{owner_user}';").stdout.strip() == 'executing',
          'SSR cannot see the protected state for its 409 response')
    expect_state_error(as_role(insert_sql('scheduled'), expect_error=True), '23505', 'Duplicate own request')
    check(as_role(f"UPDATE {table} SET status='completed',completed_at=now() WHERE id='{request_id}' RETURNING id;",
                  role='service_role', uid='').stdout.strip() == request_id, 'Service completion failed')
    record('service_claim_blocks_stale_ssr_mutations_and_service_completion_works')

    for new_state in ('scheduled', 'cancelled'):
        seed('scheduled')
        service_context = 'SET LOCAL ROLE service_role; SET LOCAL "request.jwt.claim.sub" = \'\'; '
        client_context = f'SET LOCAL ROLE authenticated; SET LOCAL "request.jwt.claim.sub" = \'{owner_user}\'; '
        blocked_then_commit(
            service_context + claim,
            'BEGIN; ' + client_context + f"UPDATE {table} SET status='{new_state}' "
            f"WHERE id='{request_id}' RETURNING id; COMMIT;",
        )
        check(stored() == 'executing', 'Client changed the state after waiting for service claim')
        record(f'rls_rechecked_after_real_lock_wait_to_{new_state}', lock_wait_observed=True)

    for state in ('executing', 'completed'):
        seed(state)
        upsert = (f"INSERT INTO {table}(user_id,scheduled_for,status) VALUES('{owner_user}','{future}','scheduled') "
                  "ON CONFLICT (user_id) DO UPDATE SET status='scheduled' RETURNING id;")
        expect_state_error(as_role(upsert, expect_error=True), '42501', 'Protected-state ON CONFLICT update')
        check(stored() == state, 'ON CONFLICT changed protected state')
    record('on_conflict_update_cannot_reset_protected_states')

    seed('scheduled')
    check(as_role(claim, role='service_role', uid='').stdout.strip() == request_id, 'Service cascade claim failed')
    as_role(f"DELETE FROM auth.users WHERE id='{owner_user}';", role='service_role', uid='')
    check(scalar(f'SELECT count(*) FROM {table};') == '0', 'FK cascade was blocked')
    check(as_role(f"UPDATE {table} SET status='completed',completed_at=now() WHERE id='{request_id}' RETURNING id;",
                  role='service_role', uid='').stdout.strip() == '', 'Expected no row after cascade')
    record('real_auth_user_cascade_and_zero_row_completion_remain_compatible')

    # A second ordinary role and an intentionally permissive fixture policy
    # prove PUBLIC + RESTRICTIVE guards cannot be defeated by OR-ing another
    # permissive policy. This policy is not added by the migration.
    query(f'CREATE POLICY rls_fixture_permissive_all ON {table} AS PERMISSIVE FOR ALL TO PUBLIC USING (true) WITH CHECK (true);')
    try:
        for state in statuses:
            seed(state)
            result = as_role(f'DELETE FROM {table} RETURNING id;', role='rls_probe')
            check(result.stdout.strip() == '' and stored() == state, 'Restrictive DELETE guard did not hold')
        record('all_four_states_resist_delete_under_extra_permissive_policy_and_second_role')
        for protected in ('executing', 'completed'):
            seed(protected)
            check(as_role(f"UPDATE {table} SET status='scheduled' RETURNING id;", role='rls_probe').stdout.strip() == '',
                  'Extra policy allowed leaving a protected state')
            check(stored() == protected, 'Protected state changed under extra policy')
        seed()
        expect_state_error(as_role(insert_sql('executing'), role='rls_probe', expect_error=True), '42501', 'Extra-policy insert')
        expect_state_error(as_role(insert_sql('scheduled', other_user), role='rls_probe', expect_error=True), '42501', 'Extra-policy foreign insert')
        seed('scheduled')
        expect_state_error(as_role(f"UPDATE {table} SET user_id='{other_user}' RETURNING id;", role='rls_probe', expect_error=True),
                           '42501', 'Extra-policy owner change')
        check(stored() == 'scheduled', 'Foreign-owner mutation altered row')
        record('restrictive_state_and_ownership_guards_hold_under_permissive_or')
    finally:
        query(f'DROP POLICY rls_fixture_permissive_all ON {table};')

    check(policies() == original_policies and policies(guards=True) == after_guards,
          'Test fixtures left policy changes behind')
    check(roles_and_grants() == original_access, 'Test fixtures left privilege changes behind')
    evidence['checks_passed'] = len(evidence['checks'])
    evidence['status'] = 'PASS'
