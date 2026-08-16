import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseInputs } from './inputs.js';

const mockGetInput = vi.hoisted(() => vi.fn<(name: string) => string>());
const mockGetBooleanInput = vi.hoisted(() =>
  vi.fn<(name: string) => boolean>(),
);

vi.mock('@actions/core', () => ({
  getBooleanInput: mockGetBooleanInput,
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
  mockGetBooleanInput.mockImplementation((name: string) => {
    const value = Object.hasOwn(values, name) ? values[name as InputName] : '';

    if (value !== 'true' && value !== 'false') {
      throw new TypeError(`Input "${name}" must be either 'true' or 'false'.`);
    }

    return value === 'true';
  });
}

describe('parseInputs', () => {
  beforeEach(() => {
    mockGetInput.mockReset();
    mockGetBooleanInput.mockReset();
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

  it.each(['0', '-1', '1.5', '3targets'])(
    'rejects invalid parallel value %s',
    (parallel) => {
      mockInputs({ parallel });

      expect(parseInputs).toThrow(
        'Input "parallel" must be a positive integer.',
      );
    },
  );

  it('parses valid boolean inputs', () => {
    mockInputs({
      all: 'false',
      affected: 'false',
      nxCloud: 'true',
    });

    expect(parseInputs()).toMatchObject({
      all: false,
      affected: false,
      nxCloud: true,
    });
  });

  it('rejects invalid boolean inputs', () => {
    mockInputs({ nxCloud: 'TRUE' });

    expect(parseInputs).toThrow('Input "nxCloud" must be either');
  });

  it('rejects an empty targets list', () => {
    mockInputs({ targets: ' , ' });

    expect(parseInputs).toThrow(
      'Input "targets" must contain at least one target.',
    );
  });

  it('allows all and affected when both are true so all can take precedence', () => {
    mockInputs({ all: 'true', affected: 'true' });

    expect(parseInputs()).toMatchObject({ all: true, affected: true });
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
