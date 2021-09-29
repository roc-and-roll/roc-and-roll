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

type CampaignListOptions = SharedOptions;

type MigrateOptions = SharedOptions;

type ExtractForOneShotOptions = SharedOptions & {
  readonly campaignId: CampaignId;
  readonly outputFilePath: string;
};

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
    | ({ command: "campaign"; subCommand: "list" } & CampaignListOptions)
    | ({
        command: "campaign";
        subCommand: "extractForOneShot";
      } & ExtractForOneShotOptions)
    | ({ command: "campaign"; subCommand: "migrate" } & MigrateOptions)
  >((resolve) => {
    program
      .command("start", { isDefault: true })
      .description("start the Roc & Roll web server")
      .option("-p, --port <port>", "http port", myParseInt, 3000)
      .option("-h, --host <host>", "http host", "127.0.0.1")
      .action((options: { port: number; host: string }, command: Command) => {
        resolve({ ...command.parent!.opts(), ...options, command: "start" });
      });

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

    campaignSubCommand
      .command("migrate")
      .description("migrate the state of all campaigns")

      .action((options: Record<never, never>, command: Command) => {
        resolve({
          ...command.parent!.parent!.opts(),
          ...command.parent!.opts(),
          ...options,
          command: "campaign",
          subCommand: "migrate",
        });
      });

    campaignSubCommand
      .command("extract-for-one-shot")
      .description(
        "extract a copy of the state to <outputFilePath> that only contains selected players, dice templates, assets, and sound sets."
      )
      .argument("campaignId", "the campaign id")
      .argument(
        "outputFilePath",
        "the file path of the generated output file",
        resolvePath
      )
      .action(
        (
          campaignId: CampaignId,
          outputFilePath: string,
          options: Record<never, never>,
          command: Command
        ) => {
          resolve({
            ...command.parent!.parent!.opts(),
            ...command.parent!.opts(),
            ...options,
            outputFilePath,
            campaignId,
            command: "campaign",
            subCommand: "extractForOneShot",
          });
        }
      );

    program.parse(process.argv);
  });
}
