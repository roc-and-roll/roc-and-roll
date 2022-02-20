import { Command, InvalidOptionArgumentError } from "commander";
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

interface SharedOptions {
  readonly workspace: string;
  readonly quiet: boolean;
}

type StartOptions = SharedOptions & {
  readonly port: number;
  readonly host: string;
};

type ExtractForOneShotOptions = SharedOptions & {
  readonly outputFilePath: string;
};

export async function setupArgs() {
  const program = new Command();

  program
    .version(`${__VERSION__}-${process.env.NODE_ENV}`)
    .requiredOption(
      "-w, --workspace <folder>",
      "workspace directory",
      resolvePath
    )
    .option("-q, --quiet", "print less to the console", false)
    .allowExcessArguments(false);

  return new Promise<
    | ({ command: "start" } & StartOptions)
    | ({ command: "extractForOneShot" } & ExtractForOneShotOptions)
  >((resolve) => {
    program
      .command("start", { isDefault: true })
      .description("starts the Roc & Roll web server")
      .option("-p, --port <port>", "http port", myParseInt, 3000)
      .option("-h, --host <host>", "http host", "127.0.0.1")
      .action((options: { port: number; host: string }, command: Command) => {
        resolve({ ...command.parent!.opts(), ...options, command: "start" });
      });

    program
      .command("extract-for-one-shot")
      .description(
        "extracts a copy of the state to <outputFile> that only contains selected players, dice templates, assets, and sound sets."
      )
      .argument(
        "<outputFile>",
        "the file path of the generated output file",
        resolvePath
      )
      .action(
        (
          outputFilePath: string,
          options: Record<never, never>,
          command: Command
        ) => {
          resolve({
            ...command.parent!.opts(),
            outputFilePath,
            ...options,
            command: "extractForOneShot",
          });
        }
      );

    program.parse(process.argv);
  });
}
