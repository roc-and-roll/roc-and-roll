import { Opaque } from "type-fest";
import { SyncedState } from "./state";

export type CampaignId = Opaque<"gameId", string>;

export type CampaignEntity = {
  readonly id: CampaignId;
  readonly name: string;
};

export type CampaignEntityWithState = CampaignEntity & {
  readonly state: SyncedState;
};
