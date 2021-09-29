import { setupWebServer } from "./setupWebServer";
import path from "path";
import fs from "fs";
import { SyncedState } from "../shared/state";
import { setupArgs } from "./setupArgs";
import { assertFFprobeIsInstalled } from "./files";
import {
  insertCampaign,
  listCampaigns,
  setupDatabase,
  updateCampaignState,
} from "./database";
import { CampaignManager } from "./campaignManager";
import { assertNever } from "../shared/util";

void (async () => {
  const {
    workspace: workspaceDir,
    quiet,
    ...commandAndOptions
  } = await setupArgs();

  await assertFFprobeIsInstalled();

  fs.mkdirSync(workspaceDir, { recursive: true });

  const uploadedFilesDir = path.join(workspaceDir, "uploaded-files");
  fs.mkdirSync(uploadedFilesDir, { recursive: true });

  const uploadedFilesCacheDir = path.join(uploadedFilesDir, "cache");
  fs.mkdirSync(uploadedFilesCacheDir, { recursive: true });

  const knex = await setupDatabase(workspaceDir);

  // TODO: Remove
  {
    if ((await listCampaigns(knex)).length === 0) {
      const { id } = await insertCampaign(knex, "Legacy Campaign");
      const statePath = path.join(workspaceDir, "state.json");
      await updateCampaignState(
        knex,
        id,
        JSON.parse(fs.readFileSync(statePath, "utf-8")) as SyncedState
      );
    }
  }

  const campaigns = await listCampaigns(knex, true);
  const campaignManagers = await Promise.all(
    campaigns.map(async (campaign) => {
      const campaignManager = new CampaignManager(
        campaign.id,
        quiet,
        workspaceDir,
        uploadedFilesDir
      );
      await campaignManager.init_migrateStateAndSetupStore(campaign.state);

      return campaignManager;
    })
  );

  if (commandAndOptions.command === "campaign") {
    switch (commandAndOptions.subCommand) {
      case "list":
        console.table(
          campaigns.map((campaign) => ({
            ID: campaign.id,
            Name: campaign.name,
            "Migration Version": campaign.state.version,
          }))
        );
        process.exit(0);
        break;
      case "extractForOneShot":
        {
          const { campaignId, outputFilePath } = commandAndOptions;

          const campaignManager = campaignManagers.find(
            (campaignManager) => campaignManager.getCampaignId() === campaignId
          );

          if (!campaignManager) {
            console.error(`Cannot find campaign with id "${campaignId}".`);
            process.exit(1);
          }

          await campaignManager.extractForOneShot(outputFilePath);
          process.exit(0);
        }
        break;
      case "migrate":
        // The migration already happens as part of loading the state.
        // We just need to make sure to persist the updated state to disk.
        for (const campaignManager of campaignManagers) {
          await campaignManager.persistState(knex);
        }
        console.log("Migration complete.");
        process.exit(0);
        break;
      default:
        assertNever(commandAndOptions);
    }
  }

  const { port: httpPort, host: httpHost } = commandAndOptions;

  const { io, url } = await setupWebServer(
    httpHost,
    httpPort,
    uploadedFilesDir,
    uploadedFilesCacheDir,
    knex
  );

  await Promise.all(
    campaignManagers.map(async (campaignManager) =>
      campaignManager.init_syncAndIO(knex, io)
    )
  );

  // TODO: When adding a new campaign, we need to start another manager!
  // TODO: When a campaign is deleted, we need to stop the manager!

  console.log(`Roc & Roll started at ${url}.`);
  console.log(`Files are stored in ${workspaceDir}.`);
  console.log(`${campaignManagers.length} active campaigns.`);
})();
