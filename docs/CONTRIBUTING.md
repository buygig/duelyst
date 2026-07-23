# Contributing to Duelyst Offline

This document will introduce you to the code and guide you through making
changes.

## Table of Contents

- [Helpful Links](#helpful-links)
- [Code Structure](#code-structure)
- [Running Tests](#tests)
- [Opening Pull Requests](#pull-requests)
- [Versioning](#versioning)
- [Where to Get Help](#help)

## Helpful Links <a id="helpful-links" />

- [Offline Single-player Guide](OFFLINE_SINGLEPLAYER.md)
- [Architecture Documentation](ARCHITECTURE.md)
- [Mocha Unit Testing API Reference](https://mochajs.org/api/)
- [Chai Assertion API Reference](https://www.chaijs.com/api/)

## Code Structure <a id="code-structure" />

An in-depth explanation of the code can be found in the Architecture
Documentation above. It explains the local runtime boundary and the dependency
direction between the UI, compatibility adapters, game rules, and AI.

To help you get acquainted more quickly, here is a list of files and
directories commonly used when working on the game:

- `app/` contains the UI, local adapters, game rules, cards, and resources
- `config/` contains the offline build configuration
- `desktop-offline/` contains the Electron shell and Windows installer metadata
- `docs/` contains documentation, including this guide
- `gulp/` and `gulpfile.babel.js` contain workflow automation, for tasks like
	building the code
- `packages/game-ai/` contains the local computer opponent
- `package.json` contains Node.js dependencies and supported commands
- `scripts/` contains offline serving, localization, asset, and content tools
- `test/` contains unit, localization, offline-adapter, and game-rule tests

#### Code Style and Linting

For JavaScript code, we use ESLint to enforce code style.
Its configuration can be found in `.eslintrc.json`.
You can run the linter with `corepack yarn lint:js:all`.
You can automatically format JS code to meet these standards by running
`corepack yarn format:js:all`.

For CoffeeScript code, we use CoffeeLint to enforce code style.
Its configuration can be found in `coffeelint.json`.
You can run it with `corepack yarn lint:coffee`.

#### Regarding JavaScript, CoffeeScript, and TypeScript

Most of the code is written in CoffeeScript, which compiles into JavaScript. We
are considering replacing CoffeeScript with JavaScript (see
[Issue #4](https://github.com/open-duelyst/duelyst/issues/4)).

We should also consider moving to TypeScript where possible.
There is a fairly strict `tsconfig.json` in the repo which has been
preconfigured for new code. After writing new TypeScript code, you can run
`yarn tsc` to build it using this config.

## Running Tests <a id="tests" />

We use `mocha` and `chai` for local unit and regression tests.

To run the focused offline regression suite:
```
corepack yarn test:offline
```

To run every retained unit test:
```
corepack yarn test:unit
```

## Opening Pull Requests <a id="pull-requests" />

Once you have a contribution ready, you can open a pull request to get it
reviewed.

Push the branch to the repository that owns this offline fork, then open a pull
request against its default branch.

If the contribution solves an open issue, you can automatically close that
issue when the PR is merged. To do this, include the text "Closes #1234" in the
PR description (to automatically close issue #1234).

When you open a pull request, some tasks will automatically start in our
Continuous Integration (CI) environment to lint and test the code.

We use [Github Actions](https://github.com/features/actions) for CI, so you can
see the atatus and results of these tasks right in the pull request itself.

Before requesting review, run the offline tests and at least one complete
`corepack yarn build:offline`.

## Versioning <a id="versioning" />

OpenDuelyst uses [Semantic Versioning](https://semver.org/) for its releases.
In version `1.96.17`, `1` is the `MAJOR` version, `96` is the `MINOR` version,
and `17` is the `PATCH` version.

For OpenDuelyst, the `MAJOR` version should not exceed `1`. Note that the
immediate release after `1.99` is `1.100` and not `2.0.0`.

## Where to Get Help <a id="help" />

Open an issue in the repository that owns this offline fork and include the
exact command, error output, operating system, and whether the browser or
desktop build was used.
