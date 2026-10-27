// Desktop-only, model-free publisher. Private state stays outside this repository.
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises';
import { hostname as computerName } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

export const PORTFOLIO_ROOT = String.raw`C:\Users\abhim\Desktop\abhiportfoliorepogroup\abhikhur27.github.io`;
export const PORTABLE_NODE = String.raw`C:\Users\abhim\AppData\Local\OpenClaw\deps\portable-node\node.exe`;
export const JOURNAL_PATH = String.raw`C:\Users\abhim\Documents\lifeorganizer\data\generated\portfolio-github-publisher.json`;
export const SNAPSHOT_PATH = 'data/github-activity.json';
const PYTHON = String.raw`C:\Users\abhim\Documents\lifeorganizer\.venv\Scripts\python.exe`;
const NOTIFIER = String.raw`C:\Users\abhim\Documents\lifeorganizer\scripts\send_static_notification.py`;
const COMMIT_MESSAGE = 'chore: refresh public GitHub activity';
const exec = promisify(execFile);

class PublisherError extends Error {
  constructor(code) { super(code); this.code = code; }
}
const fail = code => { throw new PublisherError(code); };
const hash = value => createHash('sha256').update(value).digest('hex');
const samePath = (left, right) => process.platform === 'win32'
  ? path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase()
  : path.resolve(left) === path.resolve(right);
const stable = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);

export function snapshotFingerprint(value) {
  if (!value || value.schemaVersion !== 1 || value.login !== 'abhikhur27') fail('INVALID_SNAPSHOT');
  const keys = Object.keys(value).sort();
  if (stable(keys) !== stable(['contributions', 'login', 'repositories', 'schemaVersion', 'updatedAt'])) fail('INVALID_SNAPSHOT');
  if (!Number.isFinite(Date.parse(value.updatedAt)) || !value.repositories || typeof value.repositories !== 'object'
    || Array.isArray(value.repositories) || !Object.keys(value.repositories).length) fail('INVALID_SNAPSHOT');
  const count = number => Number.isSafeInteger(number) && number >= 0;
  for (const [key, repository] of Object.entries(value.repositories)) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(key) || !repository || Object.keys(repository).sort().join(',') !== 'forks,stars,url'
      || !count(repository.stars) || !count(repository.forks) || repository.url !== `https://github.com/${key}`) fail('INVALID_SNAPSHOT');
  }
  const calendar = value.contributions;
  if (!calendar || Object.keys(calendar).sort().join(',') !== 'days,from,to,total' || !Array.isArray(calendar.days)
    || calendar.days.length < 300 || calendar.days.length > 371 || !count(calendar.total)) fail('INVALID_SNAPSHOT');
  if (calendar.days.some(day => !day || Object.keys(day).sort().join(',') !== 'count,date'
    || !/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !count(day.count))
    || calendar.from !== calendar.days[0].date || calendar.to !== calendar.days.at(-1).date
    || calendar.total !== calendar.days.reduce((sum, day) => sum + day.count, 0)) fail('INVALID_SNAPSHOT');
  if (calendar.days.some((day, index) => !Number.isFinite(Date.parse(`${day.date}T00:00:00Z`))
    || (index > 0 && Date.parse(`${day.date}T00:00:00Z`) - Date.parse(`${calendar.days[index - 1].date}T00:00:00Z`) !== 86400000))) fail('INVALID_SNAPSHOT');
  const { updatedAt: _updatedAt, ...meaningful } = value;
  return hash(stable(meaningful));
}

export async function runProcess(command, args, options = {}) {
  try {
    const result = await exec(command, args, { timeout: 120000, maxBuffer: 2 * 1024 * 1024,
      windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' }, ...options });
    return { code: 0, stdout: result.stdout };
  } catch (error) {
    // Never return command stderr, environment, credential-helper output, or raw exceptions.
    return { code: typeof error.code === 'number' ? error.code : 1, stdout: '' };
  }
}

async function readState(filename) {
  try {
    const state = JSON.parse(await readFile(filename, 'utf8'));
    if (state.version !== 1 || !state.result || !Array.isArray(state.history)) fail('INVALID_JOURNAL');
    return state;
  } catch (error) {
    if (error.code === 'ENOENT') return { version: 1, result: { status: 'never_run' }, history: [] };
    if (error instanceof PublisherError) throw error;
    fail('INVALID_JOURNAL');
  }
}

async function saveState(filename, state) {
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { flag: 'wx' });
    await rename(temporary, filename);
  } finally { await unlink(temporary).catch(() => {}); }
}

async function notifyFailure(code, incident, run) {
  const delivery = await run(PYTHON, [NOTIFIER, '--text', `Portfolio GitHub refresh stopped: ${code}. The desktop publisher receipt has the details.`,
    '--event-key', `portfolio-github-publisher:${incident}`], { cwd: path.dirname(NOTIFIER) });
  if (delivery.code !== 0) return false;
  try { return ['sent', 'already_sent'].includes(JSON.parse(delivery.stdout).discord); } catch { return false; }
}

export async function acquirePublisherLock(filename, isProcessAlive = pid => {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'ESRCH' ? false : undefined; }
}) {
  try { return await open(filename, 'wx'); } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  // Serialize recovery. Never remove an unknown, foreign-host, live, or ambiguous lock.
  const recoveryPath = `${filename}.recovery`;
  let recovery;
  try { recovery = await open(recoveryPath, 'wx'); } catch (error) {
    if (error.code === 'EEXIST') return null;
    throw error;
  }
  try {
    let bytes;
    let owner;
    try { bytes = await readFile(filename); owner = JSON.parse(bytes.toString('utf8')); } catch { return null; }
    if (bytes.length > 4096 || owner.version !== 1 || owner.kind !== 'portfolio-github-publisher'
      || owner.host !== 'ABHIONEMILLION' || !Number.isSafeInteger(owner.pid) || owner.pid <= 0
      || !Number.isFinite(Date.parse(owner.startedAt)) || isProcessAlive(owner.pid) !== false) return null;
    if (!(await readFile(filename)).equals(bytes)) return null;
    await unlink(filename);
    try { return await open(filename, 'wx'); } catch (error) {
      if (error.code === 'EEXIST') return null;
      throw error;
    }
  } finally { await recovery.close(); await unlink(recoveryPath).catch(() => {}); }
}

export async function publishGitHubData(options = {}) {
  // These injection points support offline Git fixtures. The CLI exposes no path/host overrides.
  const repo = options.repoRoot ?? PORTFOLIO_ROOT;
  const expectedRepo = options.expectedRepoRoot ?? PORTFOLIO_ROOT;
  const node = options.nodeExecutable ?? process.execPath;
  const expectedNode = options.expectedNodeExecutable ?? PORTABLE_NODE;
  const journal = options.journalPath ?? JOURNAL_PATH;
  const host = options.hostname ?? computerName();
  const cwd = options.cwd ?? process.cwd();
  const run = options.run ?? runProcess;
  const now = options.now ?? (() => new Date().toISOString());
  if (host.toUpperCase() !== 'ABHIONEMILLION') return { ok: false, code: 'WRONG_HOST' };
  if (!samePath(repo, expectedRepo) || !samePath(cwd, repo) || !samePath(node, expectedNode)) return { ok: false, code: 'WRONG_RUNTIME_OR_PATH' };
  const journalDirectory = path.dirname(journal);
  if (samePath(journalDirectory, repo) || path.relative(repo, journalDirectory).split(path.sep)[0] !== '..') return { ok: false, code: 'PUBLIC_JOURNAL_FORBIDDEN' };
  let lock;
  let state;
  const git = async (args, code, allowFailure = false) => {
    const result = await run('git', ['-C', repo, ...args], { cwd: repo });
    if (result.code && !allowFailure) fail(code);
    return result;
  };
  const text = async (args, code) => (await git(args, code)).stdout.trim();
  const status = async () => (await git(['status', '--porcelain=v1', '-z', '--untracked-files=no'], 'STATUS_FAILED')).stdout
    .split('\0').filter(Boolean).map(entry => ({ code: entry.slice(0, 2), path: entry.slice(3) }));
  const assertClean = async () => {
    const entries = await status();
    if (entries.some(entry => entry.path !== SNAPSHOT_PATH)) fail('OTHER_TRACKED_CHANGES');
    if (entries.length) fail('UNOWNED_SNAPSHOT_CHANGES');
  };
  const snapshotBytes = async () => {
    const bytes = await readFile(path.join(repo, SNAPSHOT_PATH));
    if (bytes.length > 2 * 1024 * 1024) fail('INVALID_SNAPSHOT');
    return bytes;
  };
  const verifyPending = async pending => {
    if (!pending || !/^[a-f\d]{40}$/.test(pending.baseHead ?? '') || !/^[a-f\d]{64}$/.test(pending.snapshotHash ?? '')) return false;
    const parent = await text(['rev-parse', 'HEAD^'], 'PENDING_PARENT_FAILED');
    const paths = await text(['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD'], 'PENDING_DIFF_FAILED');
    const message = await text(['log', '-1', '--format=%s'], 'PENDING_MESSAGE_FAILED');
    const blob = (await git(['show', `HEAD:${SNAPSHOT_PATH}`], 'PENDING_SNAPSHOT_FAILED')).stdout;
    return parent === pending.baseHead && paths === SNAPSHOT_PATH && message === COMMIT_MESSAGE
      && hash(blob.replaceAll('\r\n', '\n')) === pending.snapshotHash;
  };
  const pushPending = async () => {
    const head = await text(['rev-parse', 'HEAD'], 'HEAD_FAILED');
    state.pending.hash = head;
    await saveState(journal, state);
    // Normal push only. Existing Git credential configuration handles authentication internally.
    await git(['push', 'origin', 'HEAD:refs/heads/main'], 'PUSH_FAILED');
    const remote = await text(['ls-remote', 'origin', 'refs/heads/main'], 'PUSH_READBACK_FAILED');
    if (remote.split(/\s+/)[0] !== head) fail('PUSH_UNCONFIRMED');
    delete state.pending;
    return head;
  };
  try {
    if (!samePath(await realpath(repo), await realpath(expectedRepo))) fail('WRONG_REPOSITORY');
    await mkdir(journalDirectory, { recursive: true });
    lock = await acquirePublisherLock(`${journal}.lock`);
    if (!lock) return { ok: false, code: 'PUBLISHER_ALREADY_RUNNING' };
    await lock.writeFile(JSON.stringify({ version: 1, kind: 'portfolio-github-publisher', pid: process.pid, host: 'ABHIONEMILLION', startedAt: now() }));
    state = await readState(journal);
    if (!samePath(await text(['rev-parse', '--show-toplevel'], 'NOT_A_REPOSITORY'), repo)) fail('WRONG_REPOSITORY');
    if (await text(['branch', '--show-current'], 'BRANCH_FAILED') !== 'main') fail('WRONG_BRANCH');
    if (await text(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], 'UPSTREAM_FAILED') !== 'origin/main') fail('WRONG_UPSTREAM');
    const origin = await text(['remote', 'get-url', 'origin'], 'ORIGIN_FAILED');
    if (!/^(?:https:\/\/github\.com\/|git@github\.com:)abhikhur27\/abhikhur27\.github\.io(?:\.git)?$/i.test(origin)) fail('WRONG_ORIGIN');
    const defaultHead = await text(['ls-remote', '--symref', 'origin', 'HEAD'], 'DEFAULT_BRANCH_FAILED');
    if (!/^ref: refs\/heads\/main\s+HEAD$/m.test(defaultHead)) fail('WRONG_DEFAULT_BRANCH');
    await assertClean();
    await git(['ls-files', '--error-unmatch', '--', SNAPSHOT_PATH], 'SNAPSHOT_NOT_TRACKED');
    const untracked = await text(['ls-files', '--others', '--exclude-standard', '-z'], 'UNTRACKED_LIST_FAILED');
    await git(['fetch', '--no-tags', 'origin', 'main'], 'FETCH_FAILED');
    const [ahead, behind] = (await text(['rev-list', '--left-right', '--count', 'HEAD...origin/main'], 'DIVERGENCE_FAILED')).split(/\s+/).map(Number);
    let result;
    if (ahead) {
      if (ahead !== 1 || behind || !(await verifyPending(state.pending))) fail('UNOWNED_OR_DIVERGED_AHEAD');
      result = { status: 'published_retry', commit: await pushPending() };
    } else {
      if (state.pending?.hash) {
        const confirmed = await git(['merge-base', '--is-ancestor', state.pending.hash, 'origin/main'], 'PENDING_CONFIRM_FAILED', true);
        if (confirmed.code) fail('PENDING_COMMIT_UNCONFIRMED');
        delete state.pending;
      } else if (state.pending) fail('PENDING_COMMIT_UNCONFIRMED');
      await git(['merge', '--ff-only', 'origin/main'], 'FAST_FORWARD_FAILED');
      await assertClean();
      // Refresh can use the public fallback when gh is absent. Publishing still requires
      // working existing Git credentials; this probe does not change any remote ref.
      await git(['push', '--dry-run', 'origin', 'HEAD:refs/heads/main'], 'GIT_PUBLISH_AUTH_UNAVAILABLE');
      const original = await snapshotBytes();
      const beforeFingerprint = snapshotFingerprint(JSON.parse(original.toString('utf8')));
      const refresh = options.refresh ?? (() => run(node, [path.join(repo, 'scripts/refresh-github-data.mjs')], { cwd: repo }));
      const refreshed = await refresh();
      if (refreshed?.code) fail('REFRESH_FAILED');
      const updated = await snapshotBytes();
      const entries = await status();
      if (entries.some(entry => entry.path !== SNAPSHOT_PATH)) fail('REFRESH_CHANGED_OTHER_FILES');
      if (beforeFingerprint === snapshotFingerprint(JSON.parse(updated.toString('utf8')))) {
        if (!original.equals(updated)) await writeFile(path.join(repo, SNAPSHOT_PATH), original);
        result = { status: 'unchanged', commit: await text(['rev-parse', 'HEAD'], 'HEAD_FAILED') };
      } else {
        if (entries.some(entry => entry.code[0] !== ' ')) fail('STAGED_CHANGES');
        const baseHead = await text(['rev-parse', 'HEAD'], 'HEAD_FAILED');
        state.pending = { baseHead, snapshotHash: hash(updated.toString('utf8').replaceAll('\r\n', '\n')) };
        await saveState(journal, state);
        await git(['add', '--', SNAPSHOT_PATH], 'STAGE_FAILED');
        if (await text(['diff', '--cached', '--name-only'], 'STAGED_LIST_FAILED') !== SNAPSHOT_PATH) fail('UNRELATED_STAGED_CHANGES');
        if ((await status()).some(entry => entry.path !== SNAPSHOT_PATH)) fail('OTHER_TRACKED_CHANGES');
        await git(['commit', '-m', COMMIT_MESSAGE], 'COMMIT_FAILED');
        result = { status: 'published', commit: await pushPending() };
      }
    }
    if (await text(['ls-files', '--others', '--exclude-standard', '-z'], 'UNTRACKED_LIST_FAILED') !== untracked) fail('UNTRACKED_FILES_CHANGED');
    await assertClean();
    state.result = { ok: true, ...result, completedAt: now(), host, branch: 'main', snapshot: SNAPSHOT_PATH };
    delete state.failure;
    state.history = [...state.history.slice(-29), state.result];
    await saveState(journal, state);
    return state.result;
  } catch (error) {
    const code = error instanceof PublisherError ? error.code : 'PUBLISHER_IO_FAILED';
    if (state) {
      if (state.result.status !== 'failed' || state.failure?.code !== code) state.failure = { code, incident: randomUUID(), notified: false };
      state.result = { ok: false, status: 'failed', code, completedAt: now(), host };
      await saveState(journal, state).catch(() => {});
      if (!state.failure.notified) {
        state.failure.notified = await (options.notify ?? ((reason, incident) => notifyFailure(reason, incident, run)))(code, state.failure.incident).catch(() => false);
        await saveState(journal, state).catch(() => {});
      }
    }
    return { ok: false, status: 'failed', code };
  } finally {
    if (lock) { await lock.close(); await unlink(`${journal}.lock`).catch(() => {}); }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = process.argv.length === 2 ? await publishGitHubData() : { ok: false, code: 'UNSUPPORTED_ARGUMENTS' };
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
