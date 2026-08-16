import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Inputs } from './inputs.js';
import { runNx } from './run-nx.js';

const mockExec = vi.hoisted(() => vi.fn<() => Promise<number>>());
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
  beforeEach(() => {
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
  });
});
