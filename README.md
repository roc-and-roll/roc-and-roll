# Roc & Roll

[![CI](https://github.com/cmfcmf/roc-and-roll/actions/workflows/main.yml/badge.svg)](https://github.com/cmfcmf/roc-and-roll/actions/workflows/main.yml)
[![CodeQL](https://github.com/cmfcmf/roc-and-roll/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/cmfcmf/roc-and-roll/actions/workflows/codeql-analysis.yml)
[![Heroku Deploy](https://heroku-badge.herokuapp.com/?app=roc-and-roll&svg=1)](https://roc-and-roll.herokuapp.com/)

## Demo

A live demo of the main branch is deployed at https://roc-and-roll.herokuapp.com/.
Warning: All state is regularly reset.

## Development

1. Install [Node.js](https://nodejs.org/en/) version 14 or newer.
   Consider using [nvm](https://github.com/nvm-sh/nvm) if your package manager
   does not support Node.js 14 yet.
2. Install the [yarn](https://yarnpkg.com/) package manager by executing `npm install -g yarn`.
3. Install `ffprobe` (part of `ffmpeg`): `sudo apt-get install ffmpeg`
4. Clone this repository.
5. If using nvm, execute: `nvm install 14 && nvm use`
6. Install dependencies: `yarn install`

If you use VSCode:

- Open the cloned repository in VSCode by running `code roc-and-roll`.
- Press `CTRL+P` and type `>workbench.extensions.action.showRecommendedExtensions`, then install recommended extensions.
- Press `CTRL+P` and type `>workbench.action.tasks.manageAutomaticRunning`, then enable automatic workspace tasks

To run the application:

- execute `yarn dev` and visit http://localhost:3000
- alternatively, in VSCode, press `CTRL+P` and type `task dev`
- you can also

To build the application:

- execute `yarn build`

### Executing end to end (e2e) tests

- Install Playwright dependencies: `yarn playwright install-deps`
- Install test browser(s): `yarn playwright install`
- Build Roc & Roll for end to end tests: `yarn e2e-build`
- Run tests: `yarn e2e-test` (add `--debug` to debug tests)

If you use WSL, you might need to also `sudo apt-get install xvfb` and
run tests like this: `xvfb-run yarn e2e-test`. If you want to visually step
through tests, you will need to setup `vcxsrv.exe` or another way to forward X11
from WSL to Windows.

### [Client] Debugging in VSCode

To debug the client, press `CTRL+P` and type `>workbench.view.debug`.
Then select one of the provided debug configurations:

- `[client][chrome] debug`
- `[client][edge] debug`
- `[client][firefox] debug`

This will open a new browser that can be used to debug the client code.
If you use Firefox, some breakpoints might only work after refreshing the page.