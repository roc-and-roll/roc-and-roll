# Roc & Roll

## Development

1. Install [Node.js](https://nodejs.org/en/) version 14 or newer.
   Consider using [nvm](https://github.com/nvm-sh/nvm) if your package manager
   does not support Node.js 14 yet.
2. Install the [yarn](https://yarnpkg.com/) package manager by executing `npm install -g yarn`.
3. Clone this repository.
4. If using nvm, execute: `nvm install 14 && nvm use`
5. Install dependencies: `yarn install`

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