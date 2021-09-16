import { Command, InvalidOptionArgumentError } from "commander";
import packageJson from "../../package.json";
import path from "path";
import { CampaignId } from "../shared/campaign";

const { version } = packageJson;

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

type SharedOptions = {
  readonly workspace: string;
  readonly quiet: boolean;
};

type StartOptions = SharedOptions & {
  readonly port: number;
  readonly host: string;
};

type ExtractForOneShotOptions = SharedOptions & {
  readonly outputFilePath: string;
  readonly campaignId: CampaignId;
};

// eslint-disable-next-line @typescript-eslint/ban-types
type CampaignOptions = SharedOptions & {};

export async function setupArgs() {
  const program = new Command();

  program
    .version(version)
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
    | ({ command: "campaign"; subCommand: "list" } & CampaignOptions)
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
      .requiredOption(
        "-o, --output-file <path>",
        "the file path of the generated output file",
        resolvePath
      )
      .requiredOption(
        "-c, --campaign-id <campaign id>",
        "the id of the campaign"
      )
      .action(
        (
          {
            outputFile: outputFilePath,
            campaignId,
          }: { outputFile: string; campaignId: CampaignId },
          command: Command
        ) => {
          resolve({
            ...command.parent!.opts(),
            outputFilePath,
            campaignId,
            command: "extractForOneShot",
          });
        }
      );

    const campaignSubCommand = program
      .command("campaign")
      .description("manage campaigns");

    campaignSubCommand
      .command("list")
      .description("list all campaigns")
      .action((options: Record<never, never>, command: Command) => {
        resolve({
          ...command.parent!.parent!.opts(),
          ...command.parent!.opts(),
          ...options,
          command: "campaign",
          subCommand: "list",
        });
      });

    program.parse(process.argv);
  });
}
