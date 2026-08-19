import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import type { components } from '@octokit/openapi-webhooks-types';

import type { Inputs } from './inputs.js';

type PullRequestEvent =
  | components['schemas']['webhook-pull-request-opened']
  | components['schemas']['webhook-pull-request-synchronize'];
type PushEvent = components['schemas']['webhook-push'];

type GitBoundarySource =
  | 'NX_BASE environment variable'
  | 'NX_HEAD environment variable'
  | 'pull request event'
  | 'push event'
  | 'HEAD~1 fallback'
  | 'HEAD fallback';

type GitBoundary = {
  value: string;
  source: GitBoundarySource;
};

function retrieveEnvironmentBoundary(
  name: 'NX_BASE' | 'NX_HEAD',
): GitBoundary | undefined {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return undefined;
  }

  return {
    value,
    source:
      name === 'NX_BASE'
        ? 'NX_BASE environment variable'
        : 'NX_HEAD environment variable',
  };
}

async function retrieveGitBoundaryFromGit(
  ref: 'HEAD~1' | 'HEAD',
): Promise<GitBoundary> {
  let boundary = '';
  await exec.exec('git', ['rev-parse', ref], {
    listeners: {
      stdout: (data: Buffer) => (boundary += data.toString()),
    },
  });

  return {
    value: boundary.replace(/(\r\n|\n|\r)/gm, ''),
    source: ref === 'HEAD~1' ? 'HEAD~1 fallback' : 'HEAD fallback',
  };
}

async function retrieveEventGitBoundaries(
  needsBase: boolean,
  needsHead: boolean,
): Promise<[base: GitBoundary | undefined, head: GitBoundary | undefined]> {
  if (github.context.eventName === 'pull_request') {
    const prPayload = github.context.payload as PullRequestEvent;
    return [
      needsBase
        ? {
            value: prPayload.pull_request.base.sha,
            source: 'pull request event',
          }
        : undefined,
      needsHead
        ? {
            value: prPayload.pull_request.head.sha,
            source: 'pull request event',
          }
        : undefined,
    ];
  }

  if (github.context.eventName === 'push') {
    const pushPayload = github.context.payload as PushEvent;
    return [
      needsBase
        ? { value: pushPayload.before, source: 'push event' }
        : undefined,
      needsHead
        ? { value: pushPayload.after, source: 'push event' }
        : undefined,
    ];
  }

  return [
    needsBase ? await retrieveGitBoundaryFromGit('HEAD~1') : undefined,
    needsHead ? await retrieveGitBoundaryFromGit('HEAD') : undefined,
  ];
}

async function retrieveGitBoundaries(): Promise<[base: string, head: string]> {
  const envBase = retrieveEnvironmentBoundary('NX_BASE');
  const envHead = retrieveEnvironmentBoundary('NX_HEAD');

  if (envBase !== undefined && envHead !== undefined) {
    core.info(
      `Git boundary sources: base=${envBase.source}, head=${envHead.source}`,
    );
    return [envBase.value, envHead.value];
  }

  const [eventBase, eventHead] = await retrieveEventGitBoundaries(
    envBase === undefined,
    envHead === undefined,
  );
  const base = envBase ?? eventBase;
  const head = envHead ?? eventHead;

  if (base === undefined || head === undefined) {
    throw new Error('Unable to retrieve Git boundaries');
  }

  core.info(`Git boundary sources: base=${base.source}, head=${head.source}`);
  return [base.value, head.value];
}

async function nx(args: readonly string[]): Promise<void> {
  await exec.exec(`npx nx ${args.join(' ')}`);
}

async function runNxAll(args: readonly string[]): Promise<void> {
  return nx(['run-many', ...args]);
}

async function runNxProjects(
  inputs: Inputs,
  args: readonly string[],
): Promise<void> {
  return nx(['run-many', `--projects=${inputs.projects.join(',')}`, ...args]);
}

async function runNxAffected(args: readonly string[]): Promise<void> {
  const [base, head] = await core.group(
    '🏷 Retrieving Git boundaries (affected command)',
    () =>
      retrieveGitBoundaries().then(([base, head]) => {
        core.info(`Base boundary: ${base}`);
        core.info(`Head boundary: ${head}`);
        return [base, head];
      }),
  );

  return nx(['affected', `--base=${base}`, `--head=${head}`, ...args]);
}

export async function runNx(inputs: Inputs): Promise<void> {
  if (inputs.nxCloud) {
    process.env['NX_RUN_GROUP'] = github.context.runId.toString();

    if (github.context.eventName === 'pull_request') {
      const prPayload = github.context.payload as PullRequestEvent;
      process.env['NX_BRANCH'] = prPayload.number.toString();
    }
  }

  const args: readonly string[] = [
    `--targets=${inputs.targets.join(',')}`,
    `--parallel=${inputs.parallel}`,
    inputs.args,
  ];

  if (inputs.projects.length > 0) {
    return runNxProjects(inputs, args);
  } else if (inputs.all === true || inputs.affected === false) {
    return runNxAll(args);
  } else {
    return runNxAffected(args);
  }
}
