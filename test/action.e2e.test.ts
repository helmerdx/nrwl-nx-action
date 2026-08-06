import { execFile as execFileCallback } from 'node:child_process';
import {
  access,
  appendFile,
  cp,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFile = promisify(execFileCallback);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = join(repositoryRoot, 'test/fixtures/nx-workspace');
const actionBundle = join(repositoryRoot, 'dist/index.js');

async function git(workspace: string, ...args: string[]): Promise<string> {
  const { stdout } = await execFile('git', args, { cwd: workspace });
  return stdout.trim();
}

async function createWorkspace(): Promise<string> {
  const workspace = await mkdtemp(join(tmpdir(), 'nrwl-nx-action-e2e-'));
  await cp(fixtureRoot, workspace, { recursive: true });
  await symlink(
    join(repositoryRoot, 'node_modules'),
    join(workspace, 'node_modules'),
  );

  await git(workspace, 'init');
  await git(workspace, 'add', '.');
  await git(
    workspace,
    '-c',
    'user.name=E2E Test',
    '-c',
    'user.email=e2e@example.com',
    'commit',
    '-m',
    'baseline',
  );

  return workspace;
}

describe('packaged action', () => {
  it('runs only projects affected by a push', async () => {
    const workspace = await createWorkspace();

    try {
      const before = await git(workspace, 'rev-parse', 'HEAD');
      await appendFile(
        join(workspace, 'apps/app-a/src/index.ts'),
        '\nexport const changed = true;\n',
      );
      await git(workspace, 'add', '.');
      await git(
        workspace,
        '-c',
        'user.name=E2E Test',
        '-c',
        'user.email=e2e@example.com',
        'commit',
        '-m',
        'change app a',
      );
      const after = await git(workspace, 'rev-parse', 'HEAD');
      const eventPath = join(workspace, 'push-event.json');
      await writeFile(eventPath, JSON.stringify({ before, after }));

      await execFile(process.execPath, [actionBundle], {
        cwd: workspace,
        env: {
          ...process.env,
          GITHUB_EVENT_NAME: 'push',
          GITHUB_EVENT_PATH: eventPath,
          INPUT_AFFECTED: 'true',
          INPUT_ALL: 'false',
          INPUT_ARGS: '--skipNxCache',
          INPUT_NXCLOUD: 'false',
          INPUT_PARALLEL: '1',
          INPUT_PROJECTS: '',
          INPUT_TARGETS: 'marker',
          INPUT_WORKINGDIRECTORY: '',
        },
      });

      await expect(
        access(join(workspace, '.markers/app-a')),
      ).resolves.toBeUndefined();
      await expect(access(join(workspace, '.markers/app-b'))).rejects.toThrow();
    } finally {
      await rm(workspace, { force: true, recursive: true });
    }
  }, 60_000);
});
