import * as core from '@actions/core';

import { parseInputs } from './inputs.js';
import { runNx } from './run-nx.js';

async function main(): Promise<void> {
  const inputs = parseInputs();

  if (inputs.workingDirectory && inputs.workingDirectory.length > 0) {
    core.info(`🏃 Working in custom directory: ${inputs.workingDirectory}`);
    process.chdir(inputs.workingDirectory);
  }

  return runNx(inputs).catch((err: Error) => {
    core.setFailed(err);
  });
}

void main();
