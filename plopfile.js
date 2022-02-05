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
    actions: [
      {
        type: "add",
        path: "src/server/migrations/{{version}}_{{snakeCase name}}.ts",
        templateFile: ".plop-templates/migration.ts.hbs",
        data: async () => ({ version: await getNextMigrationVersion() }),
      },
      {
        type: "modify",
        path: "src/shared/constants.ts",
        pattern: /LAST_MIGRATION_VERSION = (\d+);$/m,
        template: "LAST_MIGRATION_VERSION = {{version}};",
        data: async () => ({ version: await getNextMigrationVersion() }),
      },
    ],
  });
}
