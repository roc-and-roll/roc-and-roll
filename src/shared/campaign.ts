import { MakeRRID, SyncedState } from "./state";

export type CampaignId = MakeRRID<"campaignId">;

export type CampaignEntity = {
  readonly id: CampaignId;
  readonly name: string;
  readonly lastTabletopAudioUpdate: Date;
};

export type CampaignEntityWithState = CampaignEntity & {
  readonly state: SyncedState;
};
