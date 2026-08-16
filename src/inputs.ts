import * as core from '@actions/core';

export type Inputs = {
  readonly targets: readonly string[];
  readonly projects: readonly string[];
  readonly all: boolean;
  readonly affected: boolean;
  readonly parallel: number;
  readonly args: string;
  readonly nxCloud: boolean;
  readonly workingDirectory: string;
};

function parseListInput(name: string, options?: core.InputOptions): string[] {
  return core
    .getInput(name, options)
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parseParallelInput(): number {
  const value = core.getInput('parallel');

  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error('Input "parallel" must be a positive integer.');
  }

  const parallel = Number(value);

  if (!Number.isSafeInteger(parallel)) {
    throw new Error('Input "parallel" must be a safe positive integer.');
  }

  return parallel;
}

export function parseInputs(): Inputs {
  const targets = parseListInput('targets', { required: true });
  const all = core.getBooleanInput('all');
  const affected = core.getBooleanInput('affected');

  if (targets.length === 0) {
    throw new Error('Input "targets" must contain at least one target.');
  }

  return {
    targets,
    projects: parseListInput('projects', { required: false }),
    all,
    affected,
    parallel: parseParallelInput(),
    args: core.getInput('args'),
    nxCloud: core.getBooleanInput('nxCloud'),
    workingDirectory: core.getInput('workingDirectory'),
  };
}
