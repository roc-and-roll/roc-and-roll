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
    ...(withState ? ["id", "name", "state"] : ["id", "name"])
  );

  if (withState) {
    result.forEach((each) => (each.state = JSON.parse(each.state)));
  }
  return result;
}

export async function insertCampaign(
  knex: Knex,
  name: string
): Promise<CampaignEntity> {
  const game: CampaignDBEntity = {
    id: rrid<CampaignDBEntity>(),
    name,
    state: JSON.stringify(initialSyncedState),
  };

  await knex<CampaignDBEntity>(CAMPAIGNS_TABLE_NAME).insert(game);

  return { id: game.id, name };
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
