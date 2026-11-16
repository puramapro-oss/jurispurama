#!/usr/bin/env python3
"""Actual versioned schemas + queue migration in an owned socket-only cluster.
No existing server, provider, credential, or deployment is contacted."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import select
import shlex
import shutil
import signal
import subprocess
import tempfile
import time
from ar24_postgres_scenarios import run_scenarios

parser = argparse.ArgumentParser()
parser.add_argument('--pg-bin', required=True)
parser.add_argument('--report', required=True)
args = parser.parse_args()
bins = Path(args.pg_bin).resolve()
repo = Path(__file__).resolve().parent.parent
owned = Path(tempfile.mkdtemp(prefix='juris-ar24-pg-', dir='/tmp'))
os.chmod(owned, 0o700)
data, socket = owned / 'data', owned / 'socket'
socket.mkdir(mode=0o700)
env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
env.update(PGHOST=str(socket), PGPORT='55440', PGUSER='audit_ar24', PGDATABASE='postgres', PGCONNECT_TIMEOUT='5')
psql = [str(bins / 'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose']
sessions = []
started = False
report = {'status': 'FAILED', 'checks': [], 'schemas_sha256': {}, 'scope': 'Synthetic data, actual versioned SQL, PostgreSQL locks/RLS. No PostgREST, deployed database or provider.'}

def check(value, message='Assertion failed'):
    if not value: raise AssertionError(message)

def command(argv, input=None, timeout=25):
    proc = subprocess.Popen(argv, env=env, text=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True)
    try: out, err = proc.communicate(input, timeout=timeout)
    except subprocess.TimeoutExpired:
        os.killpg(proc.pid, signal.SIGTERM)
        try: proc.communicate(timeout=2)
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL); proc.communicate(timeout=2)
        raise
    return subprocess.CompletedProcess(argv, proc.returncode, out, err)

def query(sql, expect_error=False):
    result = command(psql, sql)
    if not expect_error: check(result.returncode == 0, result.stderr)
    return result

class Session:
    def __init__(self, label):
        self.label, self.pending = label, b''
        self.err_path = owned / (label + '.stderr')
        self.err = self.err_path.open('wb')
        self.proc = subprocess.Popen(psql, env={**env, 'PGAPPNAME': label}, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=self.err, bufsize=0)
        sessions.append(self)
    def execute(self, sql):
        marker = '__END_' + self.label
        self.proc.stdin.write((sql + '\n\\echo ' + marker + '\n').encode()); self.proc.stdin.flush()
        lines, deadline = [], time.monotonic() + 10
        while True:
            if b'\n' in self.pending:
                line, self.pending = self.pending.split(b'\n', 1)
                if line.decode().strip() == marker: return '\n'.join(lines).strip()
                lines.append(line.decode()); continue
            remaining = deadline - time.monotonic()
            if remaining <= 0 or not select.select([self.proc.stdout], [], [], remaining)[0]: raise TimeoutError(self.label)
            chunk = os.read(self.proc.stdout.fileno(), 65536)
            if not chunk: raise RuntimeError(self.err_path.read_text())
            self.pending += chunk
    def close(self, crash=False):
        if self.proc.poll() is None:
            if crash: self.proc.terminate()
            else:
                try: self.proc.stdin.write(b'ROLLBACK;\n\\q\n'); self.proc.stdin.flush()
                except BrokenPipeError: pass
            try: self.proc.wait(timeout=3)
            except subprocess.TimeoutExpired: self.proc.kill(); self.proc.wait(timeout=2)
        if not self.err.closed: self.err.close()

try:
    for name in ('initdb', 'pg_ctl', 'psql'): check((bins / name).is_file(), 'Missing installed ' + name)
    init = command([str(bins / 'initdb'), '-D', str(data), '-U', 'audit_ar24', '-A', 'trust', '--no-locale', '-E', 'UTF8'])
    check(init.returncode == 0, init.stderr)
    options = f"-h '' -k {shlex.quote(str(socket))} -p 55440 -c unix_socket_permissions=0700 -c max_connections=10 -c shared_buffers=16MB -c statement_timeout=7000 -c lock_timeout=6000 -c idle_in_transaction_session_timeout=12000"
    started = True
    result = command([str(bins / 'pg_ctl'), '-D', str(data), '-l', str(owned / 'server.log'), '-o', options, '-w', '-t', '20', 'start'])
    check(result.returncode == 0, result.stderr + result.stdout + (owned / 'server.log').read_text())
    check(Path(query('SHOW data_directory;').stdout.strip()).resolve() == data.resolve(), 'Unexpected cluster')
    check(query('SHOW listen_addresses;').stdout.strip() == '', 'TCP enabled')
    report.update(server_version=query('SHOW server_version;').stdout.strip(), cluster_identity_verified=True, tcp_listening_disabled=True)
    query("""CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
      CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      CREATE TABLE storage.objects(id uuid PRIMARY KEY, bucket_id text, name text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array($1,'/') $$;""")
    for name in ('schema.sql', 'schema-p3.sql', 'schema-p4.sql', 'schema-legal.sql'):
        content = (repo / name).read_bytes(); report['schemas_sha256'][name] = hashlib.sha256(content).hexdigest(); query(content.decode())
    migration_name = 'migrations/20261116_ar24_durable_queue.sql'
    migration = (repo / migration_name).read_bytes()
    report['schemas_sha256'][migration_name] = hashlib.sha256(migration).hexdigest()
    query('ALTER TABLE jurispurama.jurispurama_notifications RENAME TO notifications_temporarily_missing;')
    rejected = query(migration.decode(), expect_error=True)
    check(rejected.returncode != 0 and '42P01' in rejected.stderr, 'Missing prerequisite did not reject migration')
    check(query("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='jurispurama' AND c.relname LIKE 'ar24_%';").stdout.strip() == '0', 'Partial queue installation remained')
    query('ALTER TABLE jurispurama.notifications_temporarily_missing RENAME TO jurispurama_notifications;')
    report['checks'].append({'case': 'missing_prerequisite_rolls_back_entire_migration', 'pass': True})
    query(migration.decode())
    run_scenarios(query=query, check=check, Session=Session, report=report)
    report['status'] = 'PASS'
except BaseException as error:
    report['error'] = f'{type(error).__name__}: {error}'
finally:
    errors = []
    for session in sessions:
        try: session.close()
        except BaseException as error: errors.append(str(error))
    stopped = not started
    if started:
        try:
            report['stop_exit_code'] = command([str(bins / 'pg_ctl'), '-D', str(data), '-m', 'fast', '-w', '-t', '15', 'stop'], timeout=20).returncode
            stopped = command([str(bins / 'pg_ctl'), '-D', str(data), 'status'], timeout=5).returncode == 3 and not (data / 'postmaster.pid').exists()
        except BaseException as error: errors.append(str(error))
    report['cluster_stopped'] = stopped
    if stopped:
        try: shutil.rmtree(owned); report['owned_cluster_removed'] = True
        except BaseException as error: errors.append(str(error))
    else: report['cleanup_required_at'] = str(owned)
    if errors or not stopped: report.update(status='FAILED', cleanup_errors=errors)
    output = Path(args.report).resolve(); output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False))
raise SystemExit(0 if report['status'] == 'PASS' else 1)
