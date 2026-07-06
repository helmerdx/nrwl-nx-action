import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseInputs } from './inputs.js';

const mockGetInput = vi.hoisted(() => vi.fn<(name: string) => string>());

vi.mock('@actions/core', () => ({
  getInput: mockGetInput,
}));

const defaultInputs = {
  targets: 'build',
  projects: '',
  all: 'false',
  affected: 'true',
  parallel: '3',
  args: '',
  nxCloud: 'false',
  workingDirectory: '',
};

type InputName = keyof typeof defaultInputs;

function mockInputs(inputs: Partial<typeof defaultInputs>): void {
  const values = {
    ...defaultInputs,
    ...inputs,
  };

  mockGetInput.mockImplementation((name: string) =>
    Object.hasOwn(values, name) ? values[name as InputName] : '',
  );
}

describe('parseInputs', () => {
  beforeEach(() => {
    mockGetInput.mockReset();
    mockInputs({});
  });

  it('trims and filters target values', () => {
    mockInputs({
      targets: 'lint, build, ,test, ',
    });

    expect(parseInputs().targets).toEqual(['lint', 'build', 'test']);
  });

  it('trims and filters project values', () => {
    mockInputs({
      projects: 'frontend, backend, ,api, ',
    });

    expect(parseInputs().projects).toEqual(['frontend', 'backend', 'api']);
  });

  it('falls back to the default parallel value when invalid', () => {
    mockInputs({
      parallel: 'not-a-number',
    });

    expect(parseInputs().parallel).toBe(3);
  });

  it('parses boolean inputs only when the value is true', () => {
    mockInputs({
      all: 'true',
      affected: 'false',
      nxCloud: 'TRUE',
    });

    expect(parseInputs()).toMatchObject({
      all: true,
      affected: false,
      nxCloud: false,
    });
  });

  it('keeps the remaining string inputs unchanged', () => {
    mockInputs({
      args: '--configuration=production',
      workingDirectory: 'apps/dashboard',
    });

    expect(parseInputs()).toMatchObject({
      args: '--configuration=production',
      workingDirectory: 'apps/dashboard',
    });
  });
});
