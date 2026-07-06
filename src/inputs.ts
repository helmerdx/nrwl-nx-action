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
  const parallel = parseInt(core.getInput('parallel'), 10);
  return Number.isNaN(parallel) ? 3 : parallel;
}

export function parseInputs(): Inputs {
  return {
    targets: parseListInput('targets', { required: true }),
    projects: parseListInput('projects', { required: false }),
    all: core.getInput('all') === 'true',
    affected: core.getInput('affected') === 'true',
    parallel: parseParallelInput(),
    args: core.getInput('args'),
    nxCloud: core.getInput('nxCloud') === 'true',
    workingDirectory: core.getInput('workingDirectory'),
  };
}
