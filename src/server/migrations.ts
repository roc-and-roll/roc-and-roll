import { Class, Promisable } from "type-fest";
import { LAST_MIGRATION_VERSION } from "../shared/constants";

export abstract class AbstractMigration {
  public abstract readonly version: number;

  public abstract migrate(oldState: any): Promisable<any>;
}

const ctx = require.context("./migrations", false, /\.ts/);
export const migrations: AbstractMigration[] = ctx
  .keys()
  .map((each) => new (ctx(each).default as Class<AbstractMigration>)())
  .sort((a, b) => a.version - b.version);

if (LAST_MIGRATION_VERSION !== migrations.length - 1) {
  throw new Error(
    `The LAST_MIGRATION_VERSION constant is set to ${LAST_MIGRATION_VERSION}, but should be set to ${
      migrations.length - 1
    }.`
  );
}

migrations.forEach((migration, i) => {
  if (migration.version !== i) {
    throw new Error(
      `Migrations must be in order and not skip a version. It looks like the migration at position ${i} has an invalid version of ${migration.version}.`
    );
  }
});
