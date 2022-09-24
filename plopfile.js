import fs from "fs-extra";
import path from "path";

async function getNextMigrationVersion() {
  const migrationFiles = await fs.readdir("./src/server/migrations");
  const lastMigrationVersion = Math.max(
    ...migrationFiles.map((file) => parseInt(path.basename(file).split("_")[0]))
  );
  if (isNaN(lastMigrationVersion)) {
    throw new TypeError("Could not determine last migration version.");
  }

  return lastMigrationVersion + 1;
}

// This is a helper class to share data between multiple actions.
class AsyncSharedData {
  static SENTINEL = {};

  constructor(fn) {
    this.fn = fn;
    this.callbacks = [];
    this.data = AsyncSharedData.SENTINEL;
  }

  getPromise() {
    return () =>
      new Promise((resolve, reject) => {
        if (this.data !== AsyncSharedData.SENTINEL) {
          if (this.data.isError) {
            reject(this.data.value);
          } else {
            resolve(this.data.value);
          }
        } else {
          this.callbacks.push({ resolve, reject });
          if (this.callbacks.length === 1) {
            this.fn().then(
              (data) => {
                this.data = {
                  isError: false,
                  value: data,
                };
                this.callbacks.forEach(({ resolve }) => resolve(data));
              },
              (error) => {
                this.data = {
                  isError: true,
                  value: error,
                };
                this.callbacks.forEach(({ reject }) => reject(error));
              }
            );
          }
        }
      });
  }
}

export default function (
  /** @type {import('plop').NodePlopAPI} */
  plop
) {
  plop.setGenerator("migration", {
    description: "state migration",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "name of the migration",
      },
    ],
    actions: () => {
      const data = new AsyncSharedData(async () => ({
        version: await getNextMigrationVersion(),
      })).getPromise();

      return [
        {
          type: "add",
          path: "src/server/migrations/{{version}}_{{snakeCase name}}.ts",
          templateFile: ".plop-templates/migration.ts.hbs",
          data,
        },
        {
          type: "modify",
          path: "src/shared/constants.ts",
          pattern: /LAST_MIGRATION_VERSION = (\d+);$/m,
          template: "LAST_MIGRATION_VERSION = {{version}};",
          data,
        },
      ];
    },
  });
}
