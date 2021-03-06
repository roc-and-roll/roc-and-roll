import { isObject } from "../shared/util";
import path from "path";
import { readdir } from "fs/promises";
import os from "os";

export function buildPatch(
  old: Record<string, unknown>,
  cur: Record<string, unknown>,
  keyPrefix: string = ""
) {
  if (typeof old !== "object" || typeof cur !== "object") {
    throw new Error("Can only patch objects!");
  }

  const deletedKeys: string[] = [];
  const keysOld = Object.keys(old);
  const keysCur = Object.keys(cur);

  const patch = keysOld.reduce((patch, keyOld: string) => {
    const keyWasDeleted = !(keyOld in cur);
    if (keyWasDeleted) {
      deletedKeys.push(`${keyPrefix}${keyOld}`);
      // It is important to set the deleted value to undefined in the patch, so
      // that the object is updated immutably.
      patch[keyOld] = undefined;
    } else {
      const valOld = old[keyOld];
      const valCur = cur[keyOld];

      if (valOld !== valCur) {
        if (!isObject(valOld) || !isObject(valCur)) {
          patch[keyOld] = valCur;
        } else {
          const { patch: innerPatch, deletedKeys: innerDeletedKeys } =
            buildPatch(valOld, valCur, `${keyPrefix}${keyOld}.`);
          if (!isEmptyObject(innerPatch)) {
            patch[keyOld] = innerPatch;
          }
          deletedKeys.push(...innerDeletedKeys);
        }
      }
    }
    return patch;
  }, {} as Record<string, unknown>);

  return {
    patch: keysCur
      .filter((keyCur) => !(keyCur in old))
      .reduce((patch, keyCur: string) => {
        patch[keyCur] = cur[keyCur];
        return patch;
      }, patch),
    deletedKeys,
  };
}

export function isEmptyObject(obj: object) {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

export async function* getFilesInDirectoryRecursively(
  directory: string
): AsyncIterable<string> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.resolve(directory, entry.name);
    if (entry.isDirectory()) {
      yield* getFilesInDirectoryRecursively(fullPath);
    } else {
      yield fullPath;
    }
  }
}

export function getDefaultHeavyIOConcurrencyLimit() {
  return Math.ceil(os.cpus().length / 2);
}
