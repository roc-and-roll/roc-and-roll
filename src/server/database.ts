import { default as knexConstructor, Knex } from "knex";
import path from "path";
import {
  CampaignEntity,
  CampaignEntityWithState,
  CampaignId,
} from "../shared/campaign";
import { initialSyncedState, SyncedState } from "../shared/state";
import { rrid } from "../shared/util";

type CampaignDBEntity = CampaignEntity & {
  readonly state: string;
};

function openConnection(workspaceDir: string) {
  return knexConstructor({
    client: "sqlite3",
    connection: {
      filename: path.join(workspaceDir, "db.sqlite"),
    },
    useNullAsDefault: true,
  });
}

export const CAMPAIGNS_TABLE_NAME = "campaigns";

export async function setupDatabase(workspaceDir: string) {
  const knex = openConnection(workspaceDir);

  if (!(await knex.schema.hasTable(CAMPAIGNS_TABLE_NAME))) {
    await knex.schema.createTable(CAMPAIGNS_TABLE_NAME, (table) => {
      table.string("id").notNullable().unique().primary();
      table.string("name").notNullable();
      table.json("state").notNullable();
      table.dateTime("lastTabletopAudioUpdate").notNullable();
    });
  }

  return knex;
}

export async function listCampaigns(
  knex: Knex,
  withState?: false
): Promise<CampaignEntity[]>;

export async function listCampaigns(
  knex: Knex,
  withState: true
): Promise<CampaignEntityWithState[]>;

export async function listCampaigns(
  knex: Knex,
  withState: boolean = false
): Promise<CampaignEntityWithState[]> {
  const result = await knex<CampaignDBEntity>(CAMPAIGNS_TABLE_NAME).select(
    ...(withState
      ? ["id", "name", "lastTabletopAudioUpdate", "state"]
      : ["id", "name", "lastTabletopAudioUpdate"])
  );

  if (withState) {
    result.forEach((each) => (each.state = JSON.parse(each.state)));
  }
  return result;
}

export async function getCampaign(
  knex: Knex,
  campaignId: CampaignId
): Promise<CampaignEntity> {
  const result = await knex<CampaignDBEntity>(CAMPAIGNS_TABLE_NAME)
    .select(["id", "name", "lastTabletopAudioUpdate"])
    .where("id", campaignId)
    .limit(1);

  if (!result[0]) {
    throw new Error(`Campaign with id ${campaignId} not found.`);
  }

  return result[0];
}

export async function insertCampaign(
  knex: Knex,
  name: string
): Promise<CampaignEntity> {
  const campaign: CampaignDBEntity = {
    id: rrid<CampaignDBEntity>(),
    name,
    state: JSON.stringify(initialSyncedState),
    lastTabletopAudioUpdate: new Date(0),
  };

  await knex<CampaignDBEntity>(CAMPAIGNS_TABLE_NAME).insert(campaign);

  return {
    id: campaign.id,
    name,
    lastTabletopAudioUpdate: campaign.lastTabletopAudioUpdate,
  };
}

export async function updateCampaignState(
  knex: Knex,
  id: CampaignId,
  state: SyncedState
) {
  await knex<CampaignDBEntity>(CAMPAIGNS_TABLE_NAME)
    .where("id", id)
    .update("state", JSON.stringify(state));
}

export async function updateCampaignLastTabletopAudioUpdate(
  knex: Knex,
  id: CampaignId,
  lastTabletopAudioUpdate: Date
) {
  await knex<CampaignDBEntity>(CAMPAIGNS_TABLE_NAME)
    .where("id", id)
    .update("lastTabletopAudioUpdate", lastTabletopAudioUpdate);
}
