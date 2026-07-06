![Banner](.github/assets/banner-thin.png)

# Nrwl Nx Action

![License](https://img.shields.io/github/license/helmerdx/nrwl-nx-action?style=flat-square) ![GitHub Issues](https://img.shields.io/github/issues/helmerdx/nrwl-nx-action?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/helmerdx/nrwl-nx-action?style=flat-square)

The action wraps the usage of the [Nrwl Nx](https://nx.dev/) monorepo development toolkit.

Nx manages multiple **projects** linked each other with a dependecy graph. One of its key
features is to permit to run one or more **tasks** only on the projects affected by our
changes (by checking the difference between two Git references).

GitHub Action's workflows provide some information about the Git references concerned
by the workflow, in a _pull request context_, we have the current commit and the last
one from the base branch. Combined with Nx, we can determine the projects affected
by the whole pull request.

> It's more than useful in a **CI/CD** context: we are able to _lint_, _build_ and _deploy_
> only the projects affected by a _pull request_ for instance.

Copy-pasting the bash code to compute the reference bounds for Nx is not that
maintenable. That's why we are open-sourcing this action to do the trick for you.

## Usage

By default, the action will try to run the provided tasks only on the affected projects.
This behavior can be modified using the different inputs (see below).

> workflow.yml

```yaml
---
- name: Checkout
  uses: actions/checkout@v6
  with:
    fetch-depth: 0

- uses: helmerdx/nrwl-nx-action@v4
  with:
    targets: lint,build,deploy
```

This simple step will run three targets: `lint`, `build` and `deploy`, sequentially
only on the affected projects. Nothing more. Simple. More examples below.

> Note:
> By default, the checkout action will only clone the latest commit of the branch,
> which will cause issues as Nx needs to compute the difference between the `base`
> and `head`. Using the `fetch-depth: 0` parameter will clone the entire
> repository, which is not optimal but functional.

## Inputs

This GitHub action can take several inputs to configure its behaviors:

| Name             | Type                 | Default | Example            | Description                                                                        |
| ---------------- | -------------------- | ------- | ------------------ | ---------------------------------------------------------------------------------- |
| targets          | Comma-separated list | ø       | `lint,test,build`  | List of targets to execute                                                         |
| projects         | Comma-separated list | ø       | `frontend,backend` | List of projects to use (more below)                                               |
| all              | Boolean              | `false` | `true`             | Run the targets on all the projects of the Nx workspace                            |
| affected         | Boolean              | `true`  | `true`             | Run the targets on the affected projects since the last modifications (more below) |
| parallel         | Number               | `3`     | `3`                | Number of tasks to execute in parallel (can be expensive)                          |
| args             | String               | ø       | `--key="value"`    | Optional args to append to the Nx commands                                         |
| nxCloud          | Boolean              | `false` | `true`             | Enable support of Nx Cloud                                                         |
| workingDirectory | String               | ø       | `myNxFolder`       | Path to the Nx workspace, needed if not the repository root                        |

**Note:** `all` and `affected` are mutually exclusive.

### `projects`

When defined, will skip the `all` and `affected` inputs. This is useful when
the workflow already knows exactly which projects should run.

### `affected`

When set to `true`, the affected detection will depend on the event type
of the workflow:

- Inside a **pull request** context, the action will use the base and head Git
  references
- Inside a **push** context, the action will use the before and after Git
  references from the push payload
- Otherwise, will compute the difference between the `HEAD` and the last
  commit

## Examples

### Run one target on all the affected projects (default)

This will run the `build` target on all the affected projects.
**This is the default behavior.**

> workflow.yml

```yaml
---
- uses: helmerdx/nrwl-nx-action@v4
  with:
    targets: build
    affected: 'true' # Defaults to true, therefore optional
```

### Run multiple targets to all projects

This will run three targets: `lint`, `test` and `build` to all the
projects of the workspace.

> workflow.yml

```yaml
---
- uses: helmerdx/nrwl-nx-action@v4
  with:
    targets: lint,test,build
    all: 'true'
```

### Run one target on some projects

This will run the `build` target on the `frontend` and `backend` projects
only.

> workflow.yml

```yaml
---
- uses: helmerdx/nrwl-nx-action@v4
  with:
    targets: build
    projects: frontend,backend
```

### Run one target on all the projects sequentially

This will run the `lint` target on all the projects of the workspace
sequentially.

> workflow.yml

```yaml
---
- uses: helmerdx/nrwl-nx-action@v4
  with:
    targets: lint
    all: 'true'
    parallel: 1
```

### Run one target on a Nx workspace located in another folder

This will run the `build` target on all the affected projects of a
Nx workspace located in another folder than the repository root.

> workflow.yml

```yaml
---
- uses: helmerdx/nrwl-nx-action@v4
  with:
    targets: build
    workingDirectory: my-nx-subfolder
```

### Run one target with Nx Cloud enabled

This will run the `build` target on all the affected projects with
Nx Cloud enabled (by adding the `--scan` command option and both
`NX_BRANCH` and `NX_RUN_GROUP` environment variables).

> workflow.yml

```yaml
---
- uses: helmerdx/nrwl-nx-action@v4
  with:
    targets: build
    nxCloud: 'true'
```

### Run affected targets after a push

This will run the `test` target on projects affected by a push. Use
`fetch-depth: 0` so Nx can compare the pushed commits.

> workflow.yml

```yaml
---
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - uses: helmerdx/nrwl-nx-action@v4
        with:
          targets: test
```

### Run affected targets outside pull request and push events

For other workflow events, the action compares `HEAD~1` and `HEAD`.

> workflow.yml

```yaml
---
on: workflow_dispatch

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 2

      - uses: helmerdx/nrwl-nx-action@v4
        with:
          targets: build
```

## Troubleshooting

### Nx cannot find the base or head commit

Use `actions/checkout` with enough Git history for the comparison you want Nx
to make. The most reliable option is:

```yaml
- uses: actions/checkout@v6
  with:
    fetch-depth: 0
```

For non-pull-request and non-push workflows, `fetch-depth: 2` is enough when the
action only needs to compare `HEAD~1` and `HEAD`.

### The action runs projects that are not affected

Check whether the `projects` input is set. When `projects` is defined, the action
uses that explicit project list and ignores `all` and `affected`.

### The action cannot find the Nx workspace

Set `workingDirectory` when the Nx workspace is not at the repository root:

```yaml
- uses: helmerdx/nrwl-nx-action@v4
  with:
    targets: build
    workingDirectory: my-nx-subfolder
```

### A pull request from a fork fails during affected detection

Make sure the checkout step fetches the base branch history. Forked pull
requests often expose only a shallow checkout unless `fetch-depth` is configured.

## License

This project is [MIT licensed](LICENSE.txt).

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/tc-developer01"><img src="https://avatars.githubusercontent.com/u/89852602?v=4?s=100" width="100px;" alt=""/><br /><sub><b>tc-developer01</b></sub></a><br /><a href="https://github.com/helmerdx/nrwl-nx-action/commits?author=tc-developer01" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
