import { Command, InvalidOptionArgumentError } from "commander";
import { version } from "../../package.json";
import path from "path";

function myParseInt(value: string): number {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidOptionArgumentError("Port must be a number.");
  }
  return parsedValue;
}

function resolvePath(value: string): string {
  return path.resolve(value);
}

export function setupArgs() {
  return new Command()
    .requiredOption(
      "-w, --workspace <folder>",
      "workspace directory",
      resolvePath
    )
    .option("-p, --port <port>", "http port", myParseInt, 3000)
    .option("-q, --quiet", "print less to the console", false)
    .version(version)
    .parse(process.argv)
    .opts() as {
    workspace: string;
    port: number;
    quiet: boolean;
  };
}
