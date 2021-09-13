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

void (async () => {
  const { workspace: workspaceDir, quiet, port: httpPort } = setupArgs();

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

  const { io, url } = await setupWebServer(
    httpPort,
    uploadedFilesDir,
    uploadedFilesCacheDir,
    knex
  );

  const campaigns = await listCampaigns(knex, true);
  const campaignManagers = await Promise.all(
    campaigns.map(async (campaign) => {
      const manager = new CampaignManager(
        knex,
        io,
        quiet,
        workspaceDir,
        uploadedFilesDir
      );
      await manager.begin(campaign);
      return manager;
    })
  );

  // TODO: When adding a new campaign, we need to start another manager!
  // TODO: When a campaign is deleted, we need to stop the manager!

  console.log(`Roc & Roll started at ${url}.`);
  console.log(`Files are stored in ${workspaceDir}.`);
  console.log(`${campaignManagers.length} active campaigns.`);
})();
