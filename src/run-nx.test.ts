import type * as exec from '@actions/exec';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Inputs } from './inputs.js';
import { runNx } from './run-nx.js';

const mockExec = vi.hoisted(() => vi.fn<typeof exec.exec>());
const mockGroup = vi.hoisted(() => vi.fn());
const mockInfo = vi.hoisted(() => vi.fn());
const mockContext = vi.hoisted(() => ({
  eventName: '',
  payload: {},
  runId: 123,
}));

vi.mock('@actions/core', () => ({
  group: mockGroup,
  info: mockInfo,
}));

vi.mock('@actions/exec', () => ({
  exec: mockExec,
}));

vi.mock('@actions/github', () => ({
  context: mockContext,
}));

const defaultInputs: Inputs = {
  targets: ['lint', 'test', 'build'],
  projects: [],
  all: false,
  affected: true,
  parallel: 5,
  args: '--configuration=ci',
  nxCloud: false,
  workingDirectory: '',
};

describe('runNx', () => {
  const originalNxBase = process.env.NX_BASE;
  const originalNxHead = process.env.NX_HEAD;

  beforeEach(() => {
    delete process.env.NX_BASE;
    delete process.env.NX_HEAD;
    mockExec.mockReset();
    mockExec.mockResolvedValue(0);
    mockGroup.mockReset();
    mockGroup.mockImplementation(
      (_name: string, fn: () => Promise<readonly [string, string]>) => fn(),
    );
    mockInfo.mockReset();
    mockContext.eventName = '';
    mockContext.payload = {};
    mockContext.runId = 123;
  });

  afterEach(() => {
    if (originalNxBase === undefined) {
      delete process.env.NX_BASE;
    } else {
      process.env.NX_BASE = originalNxBase;
    }

    if (originalNxHead === undefined) {
      delete process.env.NX_HEAD;
    } else {
      process.env.NX_HEAD = originalNxHead;
    }
  });

  it('runs all targets in one run-many command', async () => {
    await runNx({ ...defaultInputs, all: true });

    expect(mockExec).toHaveBeenCalledTimes(1);
    expect(mockExec).toHaveBeenCalledWith(
      'npx nx run-many --targets=lint,test,build --parallel=5 --configuration=ci',
    );
  });

  it('runs selected projects and all targets in one run-many command', async () => {
    await runNx({ ...defaultInputs, projects: ['frontend', 'backend'] });

    expect(mockExec).toHaveBeenCalledTimes(1);
    expect(mockExec).toHaveBeenCalledWith(
      'npx nx run-many --projects=frontend,backend --targets=lint,test,build --parallel=5 --configuration=ci',
    );
  });

  it('runs affected targets in one command using pull request boundaries', async () => {
    mockContext.eventName = 'pull_request';
    mockContext.payload = {
      pull_request: {
        base: { sha: 'base-sha' },
        head: { sha: 'head-sha' },
      },
    };

    await runNx(defaultInputs);

    expect(mockExec).toHaveBeenCalledTimes(1);
    expect(mockExec).toHaveBeenCalledWith(
      'npx nx affected --base=base-sha --head=head-sha --targets=lint,test,build --parallel=5 --configuration=ci',
    );
    expect(mockInfo).toHaveBeenCalledWith('Base boundary: base-sha');
    expect(mockInfo).toHaveBeenCalledWith('Head boundary: head-sha');
    expect(mockInfo).toHaveBeenCalledWith(
      'Git boundary sources: base=pull request event, head=pull request event',
    );
  });

  it('uses NX_BASE and NX_HEAD regardless of the event type', async () => {
    process.env.NX_BASE = 'custom-base';
    process.env.NX_HEAD = 'custom-head';
    mockContext.eventName = 'release';

    await runNx(defaultInputs);

    expect(mockExec).toHaveBeenCalledTimes(1);
    expect(mockExec).toHaveBeenCalledWith(
      'npx nx affected --base=custom-base --head=custom-head --targets=lint,test,build --parallel=5 --configuration=ci',
    );
    expect(mockInfo).toHaveBeenCalledWith(
      'Git boundary sources: base=NX_BASE environment variable, head=NX_HEAD environment variable',
    );
  });

  it('uses NX_BASE and the push head when only NX_BASE is set', async () => {
    process.env.NX_BASE = 'last-successful-run';
    mockContext.eventName = 'push';
    mockContext.payload = {
      before: 'payload-before',
      after: 'payload-after',
    };

    await runNx(defaultInputs);

    expect(mockExec).toHaveBeenCalledTimes(1);
    expect(mockExec).toHaveBeenCalledWith(
      'npx nx affected --base=last-successful-run --head=payload-after --targets=lint,test,build --parallel=5 --configuration=ci',
    );
    expect(mockInfo).toHaveBeenCalledWith(
      'Git boundary sources: base=NX_BASE environment variable, head=push event',
    );
  });

  it('uses push boundaries when no environment variables are set', async () => {
    mockContext.eventName = 'push';
    mockContext.payload = {
      before: 'payload-before',
      after: 'payload-after',
    };

    await runNx(defaultInputs);

    expect(mockExec).toHaveBeenCalledWith(
      'npx nx affected --base=payload-before --head=payload-after --targets=lint,test,build --parallel=5 --configuration=ci',
    );
    expect(mockInfo).toHaveBeenCalledWith(
      'Git boundary sources: base=push event, head=push event',
    );
  });

  it('uses HEAD~1 and HEAD for other events when no environment variables are set', async () => {
    mockContext.eventName = 'release';
    mockExec.mockImplementation((command, args, options) => {
      if (command === 'git' && args?.[1] === 'HEAD~1') {
        options?.listeners?.stdout?.(Buffer.from('fallback-base\n'));
      }

      if (command === 'git' && args?.[1] === 'HEAD') {
        options?.listeners?.stdout?.(Buffer.from('fallback-head\n'));
      }

      return Promise.resolve(0);
    });

    await runNx(defaultInputs);

    expect(mockExec.mock.calls[0]?.[0]).toBe('git');
    expect(mockExec.mock.calls[0]?.[1]).toEqual(['rev-parse', 'HEAD~1']);
    expect(mockExec.mock.calls[1]?.[0]).toBe('git');
    expect(mockExec.mock.calls[1]?.[1]).toEqual(['rev-parse', 'HEAD']);
    expect(mockExec).toHaveBeenNthCalledWith(
      3,
      'npx nx affected --base=fallback-base --head=fallback-head --targets=lint,test,build --parallel=5 --configuration=ci',
    );
    expect(mockInfo).toHaveBeenCalledWith(
      'Git boundary sources: base=HEAD~1 fallback, head=HEAD fallback',
    );
  });
});
