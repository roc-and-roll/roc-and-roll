import * as t from "typanion";
import { SyncedState } from "../shared/state";
import { EMPTY_ENTITY_COLLECTION } from "../shared/state";
import fs from "fs";
import readline from "readline";
import { isStateVersion, isSyncedState } from "../shared/validation";
import { migrations } from "./migrations";
import { LAST_MIGRATION_VERSION } from "../shared/constants";

async function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<string>((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

class StateInvalidError extends Error {
  constructor(message: string, public readonly wrappedError?: Error) {
    super(message);
  }
}

class StateInvalidRecoverableError extends StateInvalidError {
  constructor(message: string, public readonly state: unknown) {
    super(message);
  }
}

class StateValidationFailedError extends StateInvalidRecoverableError {
  constructor(public readonly validationErrors: string[], state: unknown) {
    super("The current state does not pass validation.", state);
  }
}

export async function setupInitialState(
  statePath: string
): Promise<SyncedState | undefined> {
  if (!fs.existsSync(statePath)) {
    return undefined;
  }

  let state;
  try {
    state = await loadAndMigrateState(statePath);
  } catch (err) {
    if (err instanceof StateInvalidError) {
      state = await recoverFromStateInvalidError(err);
    } else {
      throw err;
    }
  }

  if (state) {
    // Reset ephemeral state
    state.ephemeral = {
      players: EMPTY_ENTITY_COLLECTION,
      activeSongs: EMPTY_ENTITY_COLLECTION,
    };
  }

  return state;
}

const isWithVersion = t.isObject(
  { version: t.isOptional(isStateVersion) },
  { extra: t.isUnknown() }
);

async function loadAndMigrateState(
  statePath: string
): Promise<SyncedState | undefined> {
  let state;
  try {
    state = JSON.parse(fs.readFileSync(statePath, { encoding: "utf-8" }));
  } catch (err) {
    throw new StateInvalidError(
      `Error while parsing the JSON file at ${statePath}.`,
      err
    );
  }

  if (!isWithVersion(state)) {
    throw new StateInvalidError(
      `The state does not have a valid migration version`
    );
  }
  const currentVersion = state.version ?? -1;

  if (currentVersion > LAST_MIGRATION_VERSION) {
    throw new StateInvalidRecoverableError(
      `It looks like the state has already been migrated to version ${currentVersion}, even though the last migration version is ${LAST_MIGRATION_VERSION}.`,
      state
    );
  }

  if (currentVersion < LAST_MIGRATION_VERSION) {
    const stateBackupPath = `${statePath}.backup.${currentVersion}`;

    console.info(`
#
# State Migrations
#
# Your state needs to be migrated from version ${currentVersion} to version ${LAST_MIGRATION_VERSION}.
# A backup will be created at ${stateBackupPath}
#
`);
    const answer = await ask("Continue (y/n): ");
    if (answer !== "y") {
      throw new StateInvalidRecoverableError("Skipped migrations.", state);
    }

    fs.copyFileSync(statePath, stateBackupPath);

    for (let i = currentVersion + 1; i < migrations.length; i++) {
      const migration = migrations[i]!;

      try {
        console.info(`Running migration for version ${migration.version}.`);
        state = await migration.migrate(state);
        if (
          !t.isObject(
            { version: t.isUnknown() },
            { extra: t.isUnknown() }
          )(state)
        ) {
          throw new Error(
            `The migration did not return an object with a .version key.`
          );
        }
        state.version = migration.version;
      } catch (err) {
        throw new StateInvalidError(
          `An error occurred while trying to migrate the state to version ${migration.version}.`,
          err
        );
      }
    }

    console.info("Migrations finished successfully.");
  }

  const errors: string[] = [];
  if (!isSyncedState(state, { errors })) {
    throw new StateValidationFailedError(errors, state);
  }
  return state;
}

async function recoverFromStateInvalidError(error: StateInvalidError) {
  console.error(error.message);

  if (error instanceof StateValidationFailedError) {
    error.validationErrors.forEach((error) => console.error(error));
  }

  console.error(`
#
# Your state is invalid. This can lead to bugs.
#
# Do you want to...
#
# a) quit the server
# b) delete the old state
# ${error instanceof StateInvalidRecoverableError ? "c) continue anyway" : ""}
#
`);
  const answer = await ask("Your answer: ");

  switch (answer) {
    default:
    case "a":
      process.exit(1);
      break;
    case "b":
      return undefined;
    case "c":
      if (!(error instanceof StateInvalidRecoverableError)) {
        throw new Error();
      }
      return error.state as SyncedState;
  }
}
