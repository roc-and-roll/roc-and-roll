import path from "path";
import { fileURLToPath } from "url";
import chokidar from "chokidar";
import { readFile } from "fs/promises";
import * as z from "zod";

const isHashObject = z
  .strictObject({
    hash: z.string(),
  })
  .passthrough();

export async function setupClientBuildHashSubject(): Promise<ClientBuildHashSubject> {
  if (process.env.NODE_ENV !== "production") {
    return new Subject<string | null>(null);
  }

  const __filename = fileURLToPath(IMPORT_META_URL);
  const __dirname = path.dirname(__filename);

  const buildHashFilePath = path.resolve(
    __dirname,
    "client",
    "build-hash.json"
  );

  async function readBuildHashFile() {
    // TODO: This should be retried if it fails.
    try {
      const content = await readFile(buildHashFilePath, "utf-8");
      const json = JSON.parse(content);
      const validationResult = isHashObject.safeParse(json);
      if (validationResult.success) {
        return validationResult.data.hash;
      } else {
        return null;
      }
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  const subject = new Subject<string | null>(await readBuildHashFile());

  const watcher = chokidar.watch(buildHashFilePath);
  watcher.on("change", async () => {
    // TODO: Consider switching to RxJS - currently the events might arrive out
    // of order.
    subject.next(await readBuildHashFile());
  });

  return subject;
}

export type ClientBuildHashSubject = Subject<string | null>;

class Subject<T> {
  private subscribers: ((value: T) => void)[] = [];

  constructor(private currentValue: T) {}

  public subscribe(subscriber: (value: T) => void) {
    this.subscribers.push(subscriber);
  }

  public next(value: T) {
    this.currentValue = value;
    this.subscribers.forEach((subscriber) => subscriber(value));
  }

  public getValue() {
    return this.currentValue;
  }
}
