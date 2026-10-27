import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { test } from 'node:test';
import { acquirePublisherLock, portfolioGitTransport, PORTFOLIO_SSH_URL, publishGitHubData, runProcess, snapshotFingerprint, SNAPSHOT_PATH } from '../scripts/publish-github-data.mjs';

const exec = promisify(execFile);
function snapshot(stars = 1, updatedAt = '2026-10-26T00:00:00.000Z') {
  const days = Array.from({ length: 300 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10), count: index % 3,
  }));
  return { schemaVersion: 1, login: 'abhikhur27', updatedAt,
    repositories: { 'abhikhur27/example': { stars, forks: 0, url: 'https://github.com/abhikhur27/example' } },
    contributions: { from: days[0].date, to: days.at(-1).date, days, total: days.reduce((sum, day) => sum + day.count, 0) } };
}
async function fixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'portfolio-publisher-'));
  const repo = path.join(directory, 'portfolio');
  const remote = path.join(directory, 'remote.git');
  const git = async (...args) => (await exec('git', ['-C', repo, ...args], { windowsHide: true })).stdout.trim();
  await exec('git', ['init', '--bare', '--initial-branch=main', remote], { windowsHide: true });
  await exec('git', ['clone', remote, repo], { windowsHide: true });
  await git('config', 'user.name', 'Publisher Test');
  await git('config', 'user.email', 'publisher-test@example.invalid');
  await git('config', 'core.autocrlf', 'false');
  await mkdir(path.join(repo, 'data'));
  await writeFile(path.join(repo, SNAPSHOT_PATH), `${JSON.stringify(snapshot(), null, 2)}\n`);
  await writeFile(path.join(repo, 'index.html'), '<h1>Existing user page</h1>\n');
  await git('add', '.');
  await git('commit', '-m', 'test: initial fixture');
  await git('push', '-u', 'origin', 'main');
  const calls = [];
  const notifications = [];
  const controls = { auth: true, failPush: false, refreshes: 0, next: snapshot(2),
    pushUrls: 'https://github.com/abhikhur27/abhikhur27.github.io.git\n' };
  const run = async (command, args, options) => {
    calls.push([command, ...args]);
    const operation = args.slice(2);
    if (command === 'git' && operation.join(' ') === 'remote get-url origin') return { code: 0, stdout: 'https://github.com/abhikhur27/abhikhur27.github.io.git\n' };
    if (command === 'git' && operation.join(' ') === 'remote get-url --push --all origin') return { code: 0, stdout: controls.pushUrls };
    if (command === 'git' && operation[0] === 'push'
      && ((!controls.auth && operation.includes('--dry-run')) || (controls.failPush && !operation.includes('--dry-run')))) return { code: 1, stdout: 'secret-credential-detail' };
    return runProcess(command, args, options);
  };
  const options = { repoRoot: repo, expectedRepoRoot: repo, cwd: repo, gitTransport: false,
    nodeExecutable: process.execPath, expectedNodeExecutable: process.execPath,
    journalPath: path.join(directory, 'private', 'publisher.json'), hostname: 'ABHIONEMILLION', run,
    notify: async (code, incident) => { notifications.push({ code, incident }); return true; },
    refresh: async () => { controls.refreshes++; await writeFile(path.join(repo, SNAPSHOT_PATH), `${JSON.stringify(controls.next, null, 2)}\n`); return { code: 0 }; },
  };
  return { repo, remote, git, options, controls, calls, notifications,
    readSnapshot: () => readFile(path.join(repo, SNAPSHOT_PATH), 'utf8') };
}

test('snapshot comparison ignores timestamps and object ordering, but rejects unsafe shapes', () => {
  const first = snapshot();
  const second = snapshot(1, '2026-10-27T00:00:00.000Z');
  second.repositories['abhikhur27/example'] = { url: 'https://github.com/abhikhur27/example', forks: 0, stars: 1 };
  assert.equal(snapshotFingerprint(first), snapshotFingerprint(second));
  assert.notEqual(snapshotFingerprint(first), snapshotFingerprint(snapshot(2)));
  assert.throws(() => snapshotFingerprint({ ...first, token: 'must-not-publish' }));
  assert.throws(() => snapshotFingerprint({ ...first, repositories: {} }));
});

test('deploy-key transport rewrites only the exact portfolio HTTPS origins without saving config', async () => {
  const f = await fixture();
  const transport = portfolioGitTransport();
  assert.equal(transport.config.length, 4);
  assert.match(transport.env.GIT_SSH_COMMAND, /StrictHostKeyChecking=yes/);
  assert.match(transport.env.GIT_SSH_COMMAND, /IdentitiesOnly=yes/);
  assert.match(transport.env.GIT_SSH_COMMAND, /portfolio_github_ed25519/);
  assert.match(transport.env.GIT_SSH_COMMAND, /portfolio_github_known_hosts/);
  assert.match(transport.env.GIT_SSH_COMMAND, /^"C:\/Program Files\/Git\/usr\/bin\/ssh.exe" -4 -F \/dev\/null/);
  for (const suffix of ['', '.git']) {
    const original = `https://github.com/abhikhur27/abhikhur27.github.io${suffix}`;
    await f.git('remote', 'set-url', 'origin', original);
    const { stdout } = await exec('git', ['-C', f.repo, ...transport.config, 'remote', 'get-url', 'origin'], { windowsHide: true });
    assert.equal(stdout.trim(), PORTFOLIO_SSH_URL);
    assert.equal(await f.git('remote', 'get-url', 'origin'), original);
  }
  const unrelated = 'https://github.com/abhikhur27/unrelated.git';
  await f.git('remote', 'set-url', 'origin', unrelated);
  const { stdout } = await exec('git', ['-C', f.repo, ...transport.config, 'remote', 'get-url', 'origin'], { windowsHide: true });
  assert.equal(stdout.trim(), unrelated);
});

test('wrong host, runtime path, and public journal fail before invoking Git or refresh', async () => {
  const f = await fixture();
  assert.equal((await publishGitHubData({ ...f.options, hostname: 'ABHIKHUR' })).code, 'WRONG_HOST');
  assert.equal((await publishGitHubData({ ...f.options, expectedRepoRoot: path.join(f.repo, 'elsewhere') })).code, 'WRONG_RUNTIME_OR_PATH');
  assert.equal((await publishGitHubData({ ...f.options, journalPath: path.join(f.repo, 'receipt.json') })).code, 'PUBLIC_JOURNAL_FORBIDDEN');
  assert.equal(f.calls.length, 0);
});

test('unrelated or multiple push origins fail before every network call', async () => {
  for (const pushUrls of ['https://github.com/abhikhur27/abhikhur27.github.io-other.git\n',
    'https://github.com/abhikhur27/abhikhur27.github.io.git\nhttps://github.com/abhikhur27/another.git\n']) {
    const f = await fixture();
    f.controls.pushUrls = pushUrls;
    assert.equal((await publishGitHubData(f.options)).code, 'WRONG_PUSH_ORIGIN');
    assert.equal(f.calls.some(call => call.includes('ls-remote') || call.includes('fetch') || call.includes('push')), false);
    assert.equal(f.controls.refreshes, 0);
  }
});

test('timestamp-only refresh keeps the original snapshot bytes and creates no commit', async () => {
  const f = await fixture();
  const original = await f.readSnapshot();
  const head = await f.git('rev-parse', 'HEAD');
  f.controls.next = snapshot(1, '2026-10-27T00:00:00.000Z');
  const result = await publishGitHubData(f.options);
  assert.equal(result.status, 'unchanged');
  assert.equal(await f.readSnapshot(), original);
  assert.equal(await f.git('rev-parse', 'HEAD'), head);
  assert.equal(await f.git('status', '--porcelain'), '');
  assert.equal(f.calls.some(call => call.includes('commit') || (call.includes('push') && !call.includes('--dry-run'))), false);
});

test('meaningful refresh publishes only the exact snapshot and preserves user files and branches', async () => {
  const f = await fixture();
  await writeFile(path.join(f.repo, 'untracked-user.txt'), 'leave this alone');
  await f.git('branch', 'existing-user-branch');
  const other = await f.git('rev-parse', 'existing-user-branch');
  const result = await publishGitHubData(f.options);
  assert.equal(result.ok, true);
  assert.equal(result.status, 'published');
  assert.equal(await f.git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD'), SNAPSHOT_PATH);
  assert.equal(await readFile(path.join(f.repo, 'untracked-user.txt'), 'utf8'), 'leave this alone');
  assert.equal(await f.git('rev-parse', 'existing-user-branch'), other);
  assert.equal((await f.git('ls-remote', 'origin', 'refs/heads/main')).split(/\s+/)[0], result.commit);
  assert.equal(f.calls.some(call => call.includes('--force') || call.includes('rebase') || call.includes('reset')), false);
});

test('unrelated tracked changes and user-edited snapshot are preserved without refresh or commit', async () => {
  for (const filename of ['index.html', SNAPSHOT_PATH]) {
    const f = await fixture();
    await writeFile(path.join(f.repo, filename), 'user work must survive');
    const result = await publishGitHubData(f.options);
    assert.equal(result.ok, false);
    assert.equal(await readFile(path.join(f.repo, filename), 'utf8'), 'user work must survive');
    assert.equal(f.controls.refreshes, 0);
    assert.equal(f.calls.some(call => call.includes('commit') || call.includes('push')), false);
  }
});

test('failed push preserves the owned commit and retries a normal push without refreshing again', async () => {
  const f = await fixture();
  f.controls.failPush = true;
  const failed = await publishGitHubData(f.options);
  assert.equal(failed.code, 'PUSH_FAILED');
  const head = await f.git('rev-parse', 'HEAD');
  const journal = await readFile(f.options.journalPath, 'utf8');
  assert.equal(JSON.parse(journal).pending.hash, head);
  assert.equal(journal.includes('secret-credential-detail'), false);
  f.controls.failPush = false;
  const retried = await publishGitHubData(f.options);
  assert.equal(retried.status, 'published_retry');
  assert.equal(retried.commit, head);
  assert.equal(f.controls.refreshes, 1);
  assert.equal((await f.git('ls-remote', 'origin', 'refs/heads/main')).split(/\s+/)[0], head);
});

test('an unrelated local commit is never published or rewritten', async () => {
  const f = await fixture();
  await writeFile(path.join(f.repo, 'index.html'), '<h1>User commit</h1>');
  await f.git('add', 'index.html');
  await f.git('commit', '-m', 'user: preserve my work');
  const head = await f.git('rev-parse', 'HEAD');
  const result = await publishGitHubData(f.options);
  assert.equal(result.code, 'UNOWNED_OR_DIVERGED_AHEAD');
  assert.equal(await f.git('rev-parse', 'HEAD'), head);
  assert.equal(f.controls.refreshes, 0);
  assert.equal(f.calls.some(call => call.includes('push') || call.includes('reset') || call.includes('rebase')), false);
});

test('unchanged failures notify once per transition and never expose credential diagnostics', async () => {
  const f = await fixture();
  f.controls.auth = false;
  await publishGitHubData(f.options);
  await publishGitHubData(f.options);
  assert.equal(f.notifications.length, 1);
  assert.equal(f.notifications[0].code, 'GIT_PUBLISH_AUTH_UNAVAILABLE');
  f.controls.auth = true;
  f.controls.next = snapshot();
  assert.equal((await publishGitHubData(f.options)).ok, true);
  f.controls.auth = false;
  await publishGitHubData(f.options);
  assert.equal(f.notifications.length, 2);
  assert.notEqual(f.notifications[0].incident, f.notifications[1].incident);
  assert.equal((await readFile(f.options.journalPath, 'utf8')).includes('secret-credential-detail'), false);
});

test('lock recovery removes only a valid own lock whose PID is definitely dead', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'portfolio-lock-'));
  const filename = path.join(directory, 'publisher.json.lock');
  const bytes = JSON.stringify({ version: 1, kind: 'portfolio-github-publisher', pid: 12345,
    host: 'ABHIONEMILLION', startedAt: '2026-10-26T00:00:00.000Z' });
  await writeFile(filename, bytes);
  for (const answer of [true, undefined]) {
    assert.equal(await acquirePublisherLock(filename, () => answer), null);
    assert.equal(await readFile(filename, 'utf8'), bytes);
  }
  const acquired = await acquirePublisherLock(filename, () => false);
  assert.ok(acquired);
  await acquired.close();
  await unlink(filename);
  const foreign = bytes.replace('ABHIONEMILLION', 'ABHIKHUR');
  await writeFile(filename, foreign);
  assert.equal(await acquirePublisherLock(filename, () => false), null);
  assert.equal(await readFile(filename, 'utf8'), foreign);
});
