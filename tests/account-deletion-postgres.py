#!/usr/bin/env python3
"""Check deletion predicates in an exclusively owned, socket-only PostgreSQL cluster.

No existing server is contacted. Uses the exact versioned schema-legal.sql and
synthetic users. Requires installed initdb, pg_ctl and psql; installs nothing.
This checks PostgreSQL constraints, locks and draft RLS using synthetic roles.
The service role exists only in this newly initialized private cluster.
It does not exercise Supabase transport, deployed privileges or production.
"""
import argparse
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import shlex
import shutil
import signal
import select
import subprocess
import tempfile
import time
from account_deletion_rls_scenarios import run_rls_scenarios

parser = argparse.ArgumentParser()
parser.add_argument('--pg-bin', required=True)
parser.add_argument('--schema', required=True)
parser.add_argument('--report', required=True)
parser.add_argument('--migration', required=True)
parser.add_argument('--migration-sha256', required=True)
args = parser.parse_args()

def check(condition, message='Verification failed'):
    if not condition:
        raise RuntimeError(str(message))

bins = Path(args.pg_bin).resolve()
schema = Path(args.schema).resolve()
schema_bytes = schema.read_bytes()
migration = Path(args.migration).resolve()
migration_bytes = migration.read_bytes()
migration_sha256 = hashlib.sha256(migration_bytes).hexdigest()
check(migration_sha256 == args.migration_sha256, 'Unexpected migration hash; review before running.')
schema_blob = hashlib.sha1(b'blob ' + str(len(schema_bytes)).encode() + b'\0' + schema_bytes).hexdigest()
check(schema_blob == '340ba7920659bac96d2dc619d6daf556266a2abb', 'Unexpected schema; review before running.')
for name in ('initdb', 'pg_ctl', 'psql'):
    check((bins / name).is_file(), f'Missing installed binary: {name}')

owned = Path(tempfile.mkdtemp(prefix='juris-delete-pg-', dir='/tmp'))
os.chmod(owned, 0o700)
data = owned / 'data'
socket = owned / 'socket'
socket.mkdir(mode=0o700)
env = {key: value for key, value in os.environ.items() if not key.startswith('PG')}
env.update(PGHOST=str(socket), PGPORT='55439', PGUSER='audit_juris', PGDATABASE='postgres', PGCONNECT_TIMEOUT='5')
psql = [str(bins / 'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-h', str(socket), '-p', '55439', '-U', 'audit_juris', '-d', 'postgres']
sessions = []
start_attempted = False
checks = []
user = '00000000-0000-0000-0000-000000000001'
request = '10000000-0000-0000-0000-000000000001'
due = '2026-11-10T12:00:00Z'
cutoff = '2026-11-11T12:00:00Z'
claim = f"""UPDATE jurispurama.account_deletion_requests SET status='executing'
WHERE id='{request}' AND user_id='{user}' AND status='scheduled'
AND scheduled_for='{due}' AND scheduled_for<='{cutoff}' RETURNING id;"""
cancel = f"""UPDATE jurispurama.account_deletion_requests
SET status='cancelled', cancelled_at='{cutoff}'
WHERE user_id='{user}' AND status='scheduled' RETURNING id;"""
reschedule = f"""UPDATE jurispurama.account_deletion_requests
SET user_id='{user}', status='scheduled', scheduled_for='2026-12-11T12:00:00Z', reason=NULL, cancelled_at=NULL, completed_at=NULL
WHERE id='{request}' AND user_id='{user}' AND status='scheduled' AND scheduled_for='{due}' RETURNING id;"""
insert = f"""INSERT INTO jurispurama.account_deletion_requests(user_id,scheduled_for,status)
VALUES('{user}','2026-12-11T12:00:00Z','scheduled') RETURNING id;"""

def command(argv, **kwargs):
    timeout = kwargs.pop('timeout', 25)
    input_text = kwargs.pop('input', None)
    process = subprocess.Popen(argv, env=env, text=True, stdin=subprocess.PIPE,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True, **kwargs)
    try:
        stdout, stderr = process.communicate(input_text, timeout=timeout)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            process.communicate(timeout=2)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            process.communicate(timeout=2)
        raise
    return subprocess.CompletedProcess(argv, process.returncode, stdout, stderr)

def query(sql, expect_error=False):
    result = command(psql, input=sql)
    if not expect_error:
        check(result.returncode == 0, result.stderr)
    return result

def reset(with_request=True):
    query(f"TRUNCATE auth.users CASCADE; INSERT INTO auth.users(id) VALUES('{user}');")
    if with_request:
        query(f"INSERT INTO jurispurama.account_deletion_requests(id,user_id,scheduled_for,status) VALUES('{request}','{user}','{due}','scheduled');")

class Session:
    def __init__(self, label):
        self.label = label
        self.pending = b''
        self.stderr_path = owned / (label + '.stderr')
        self.stderr_file = self.stderr_path.open('wb')
        self.proc = subprocess.Popen(psql, env={**env, 'PGAPPNAME': label},
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=self.stderr_file, bufsize=0)
        sessions.append(self)
    def execute(self, sql):
        marker = f'__JURIS_END_{self.label}__'
        self.proc.stdin.write((sql + '\n\\echo ' + marker + '\n').encode())
        self.proc.stdin.flush()
        result = []
        deadline = time.monotonic() + 10
        while True:
            if b'\n' in self.pending:
                line, self.pending = self.pending.split(b'\n', 1)
                decoded = line.decode()
                if decoded.strip() == marker:
                    return '\n'.join(result).strip()
                result.append(decoded)
                continue
            remaining = deadline - time.monotonic()
            if remaining <= 0 or not select.select([self.proc.stdout], [], [], remaining)[0]:
                raise TimeoutError(f'Bounded session read expired: {self.label}')
            chunk = os.read(self.proc.stdout.fileno(), 65536)
            if not chunk:
                self.stderr_file.flush()
                raise RuntimeError(self.stderr_path.read_text())
            self.pending += chunk
    def close(self):
        if self.proc.poll() is None:
            try:
                self.proc.stdin.write(b'ROLLBACK;\n\\q\n')
                self.proc.stdin.flush()
                self.proc.wait(timeout=3)
            except (BrokenPipeError, subprocess.TimeoutExpired):
                self.proc.kill()
                self.proc.wait(timeout=3)
        self.stderr_file.close()
    def abort(self):
        if self.proc.poll() is None:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self.proc.kill()
                self.proc.wait(timeout=2)

def blocked_then_commit(first_sql, second_sql, expected_first=request, expected_second=''):
    """The second SQL is actually observed waiting on a PostgreSQL lock."""
    serial = len(sessions) // 2
    first = Session(f'juris_first_{serial}')
    second = Session(f'juris_second_{serial}')
    check(first.execute('BEGIN;\n' + first_sql) == expected_first, 'Verification failed')
    pool = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    future = None
    try:
        future = pool.submit(second.execute, second_sql)
        try:
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline:
                wait = query(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{second.label}' AND wait_event_type='Lock';").stdout.strip()
                if wait == '1':
                    break
                check(not future.done(), 'Second query did not overlap the locked transaction.')
                time.sleep(0.025)
            else:
                raise AssertionError('PostgreSQL lock wait was not observed.')
        finally:
            try:
                first.execute('COMMIT;')
            except BaseException:
                first.abort()
                second.abort()
                raise
        check(future.result(timeout=5) == expected_second, 'Verification failed')
    finally:
        if future is not None and not future.done():
            second.abort()
        pool.shutdown(wait=True, cancel_futures=True)
    first.close()
    second.close()

report = {'status': 'FAILED', 'schema_git_blob': schema_blob, 'schema_source_commit': 'e5fb2a3d28b89f1c54ecc3c90325f4d2b4b1c7b5', 'migration_sha256': migration_sha256, 'checks': checks, 'scope': 'Versioned schema in disposable socket-only PostgreSQL. Eight SQL scenarios align with route predicates at e5fb2a3d; separate RLS scenarios use synthetic granted non-owner roles and the additive draft migration. Supabase/Next/PostgREST transport, production grants/exposure, deployed schema, GDPR timing and real users are not exercised.'}
try:
    init = command([str(bins / 'initdb'), '-D', str(data), '-U', 'audit_juris', '-A', 'trust', '--no-locale', '-E', 'UTF8'])
    check(init.returncode == 0, init.stderr)
    options = f"-h '' -k {shlex.quote(str(socket))} -p 55439 -c unix_socket_permissions=0700 -c max_connections=10 -c shared_buffers=16MB -c statement_timeout=7000 -c lock_timeout=6000 -c idle_in_transaction_session_timeout=12000"
    start_attempted = True
    start = command([str(bins / 'pg_ctl'), '-D', str(data), '-l', str(owned / 'server.log'), '-o', options, '-w', '-t', '20', 'start'])
    check(start.returncode == 0, start.stderr + start.stdout)
    report['server_version'] = query('SHOW server_version;').stdout.strip()
    cluster_directory = query('SHOW data_directory;').stdout.strip()
    check(Path(cluster_directory).resolve() == data.resolve(), 'Unexpected PostgreSQL data directory.')
    check(query('SHOW listen_addresses;').stdout.strip() == '', 'TCP unexpectedly enabled.')
    check(query('SHOW port;').stdout.strip() == '55439', 'Unexpected cluster port.')
    report['cluster_identity_verified'] = True
    report['tcp_listening_disabled'] = True
    query("CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE SCHEMA jurispurama; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;")
    query(schema_bytes.decode())

    reset()
    blocked_then_commit(cancel, claim)
    check(query(f"SELECT status FROM jurispurama.account_deletion_requests WHERE id='{request}';").stdout.strip() == 'cancelled', 'Verification failed')
    checks.append({'case': 'cancellation_commits_before_claim', 'pass': True, 'lock_wait_observed': True})

    reset()
    blocked_then_commit(claim, cancel)
    checks.append({'case': 'claim_commits_before_cancellation', 'pass': True, 'lock_wait_observed': True})

    reset()
    blocked_then_commit(claim, claim)
    checks.append({'case': 'two_concurrent_claims_only_one_row_returned', 'pass': True, 'lock_wait_observed': True})

    reset()
    blocked_then_commit(reschedule, claim)
    checks.append({'case': 'rescheduled_deadline_prevents_stale_claim', 'pass': True, 'lock_wait_observed': True})

    reset()
    blocked_then_commit(claim, reschedule)
    conflict = query(insert, expect_error=True)
    check(conflict.returncode != 0 and '23505' in conflict.stderr, conflict.stderr)
    check(query(f"SELECT status FROM jurispurama.account_deletion_requests WHERE user_id='{user}';").stdout.strip() == 'executing', 'Verification failed')
    checks.append({'case': 'claim_blocks_stale_reschedule_and_unique_constraint_prevents_duplicate', 'pass': True, 'lock_wait_observed': True})

    reset()
    query(f"DELETE FROM jurispurama.account_deletion_requests WHERE id='{request}';")
    check(query(claim).stdout.strip() == '', 'Verification failed')
    checks.append({'case': 'absent_request_has_no_claim_receipt', 'pass': True})

    reset()
    check(query(claim).stdout.strip() == request, 'Verification failed')
    query(f"DELETE FROM auth.users WHERE id='{user}';")
    completion = query(f"UPDATE jurispurama.account_deletion_requests SET status='completed', completed_at='{cutoff}' WHERE id='{request}' RETURNING id;")
    check(completion.stdout.strip() == '', 'Verification failed')
    check(query('SELECT count(*) FROM jurispurama.account_deletion_requests;').stdout.strip() == '0', 'Verification failed')
    checks.append({'case': 'real_fk_cascade_removes_request_zero_completion_is_expected', 'pass': True})

    reset(with_request=False)
    query(insert)
    conflict = query(insert, expect_error=True)
    check(conflict.returncode != 0 and '23505' in conflict.stderr, conflict.stderr)
    check(query('SELECT count(*) FROM jurispurama.account_deletion_requests;').stdout.strip() == '1', 'Verification failed')
    checks.append({'case': 'unique_user_id_rejects_second_insert_without_rewrite', 'pass': True})
    run_rls_scenarios(query=query, check=check, report=report,
        migration_sql=migration_bytes.decode(), blocked_then_commit=blocked_then_commit)
    report['status'] = 'PASS'
except BaseException as error:
    report['error'] = f'{type(error).__name__}: {error}'
finally:
    cleanup_errors = []
    for session in sessions:
        try:
            session.close()
        except BaseException as error:
            cleanup_errors.append(f'Client cleanup: {type(error).__name__}: {error}')
    stopped = not start_attempted
    if start_attempted:
        try:
            stop = command([str(bins / 'pg_ctl'), '-D', str(data), '-m', 'fast', '-w', '-t', '15', 'stop'], timeout=20)
            report['stop_exit_code'] = stop.returncode
        except BaseException as error:
            cleanup_errors.append(f'Cluster stop: {type(error).__name__}: {error}')
        try:
            status = command([str(bins / 'pg_ctl'), '-D', str(data), 'status'], timeout=5)
            stopped = status.returncode == 3 and not (data / 'postmaster.pid').exists()
        except BaseException as error:
            cleanup_errors.append(f'Cluster status: {type(error).__name__}: {error}')
            stopped = False
    report['cluster_stopped'] = stopped
    if report['cluster_stopped']:
        try:
            shutil.rmtree(owned)
            report['owned_cluster_removed'] = True
        except BaseException as error:
            cleanup_errors.append(f'Owned directory cleanup: {type(error).__name__}: {error}')
            report['owned_cluster_removed'] = False
    else:
        report['status'] = 'FAILED'
        report['owned_cluster_removed'] = False
        report['cleanup_required_at'] = str(owned)
    if cleanup_errors:
        report['status'] = 'FAILED'
        report['cleanup_errors'] = cleanup_errors
    output = Path(args.report).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False))
raise SystemExit(0 if report['status'] == 'PASS' else 1)
