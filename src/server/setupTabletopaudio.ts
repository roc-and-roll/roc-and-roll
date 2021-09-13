import {
  assetSongAdd,
  assetSongUpdate,
  assetSongRemove,
} from "../shared/actions";
import { entries, RRAssetSong } from "../shared/state";
import { partition, rrid } from "../shared/util";
import { MyStore } from "./setupReduxStore";
import fetch from "node-fetch";
import {
  isTabletopAudioAsset,
  isTabletopAudioIndex,
} from "../shared/tabletopaudio";
import { batchActions } from "redux-batched-actions";
import { Knex } from "knex";
import { CampaignId } from "../shared/campaign";
import { getCampaign, updateCampaignLastTabletopAudioUpdate } from "./database";

// TODO: Ideally, this should be executed globally, and not per campaign
export async function setupTabletopAudioTrackSync(
  store: MyStore,
  knex: Knex,
  campaignId: CampaignId
) {
  // Update list of tabletop audio files once per day
  setInterval(
    async () => updateTabletopAudioTracks(store, knex, campaignId),
    24 * 60 * 60 * 1000
  );

  // Update list of tabletop audio files immediately only if the last update
  // attempt happened more than an hour ago.
  if (
    (await getLastUpdateAttempt(knex, campaignId)) <
    new Date(Date.now() - 60 * 60 * 1000)
  ) {
    await updateTabletopAudioTracks(store, knex, campaignId);
  }
}

async function rememberUpdateAttempt(knex: Knex, campaignId: CampaignId) {
  await updateCampaignLastTabletopAudioUpdate(knex, campaignId, new Date());
}

async function getLastUpdateAttempt(knex: Knex, campaignId: CampaignId) {
  const campaign = await getCampaign(knex, campaignId);
  return campaign.lastTabletopAudioUpdate;
}

async function updateTabletopAudioTracks(
  store: MyStore,
  knex: Knex,
  campaignId: CampaignId
) {
  await rememberUpdateAttempt(knex, campaignId);

  let result;
  try {
    result = await fetch("https://tabletopaudio.com/tta_data");
  } catch (err) {
    console.error("Error fetching tabletop audio song index.");
    console.error(err);
    return;
  }

  if (result.status !== 200) {
    console.error(
      "Error fetching tabletop audio song index. Status code is not 200:"
    );
    console.error(result.statusText);
    return;
  }

  const json = await result.json();
  const errors: string[] = [];
  if (!isTabletopAudioIndex(json, { errors })) {
    console.error("Error parsing tabletop audio song index.");
    errors.forEach((error) => console.error(error));
    return;
  }

  console.log("Updating tabletop audio tracks.");

  const newTrackMap = new Map(json.tracks.map((track) => [track.key, track]));

  const existingTabletopAudioAssetMap = new Map(
    entries(store.getState().assets).flatMap((existingAsset) => {
      if (!isTabletopAudioAsset(existingAsset)) {
        return [];
      }
      return [[existingAsset.extra.tabletopAudioKey, existingAsset]];
    })
  );

  const newKeys = [...newTrackMap.keys()].filter(
    (newKey) => !existingTabletopAudioAssetMap.has(newKey)
  );

  const [removedKeys, updatedKeys] = partition(
    existingTabletopAudioAssetMap.keys(),
    (existingKey) => !newTrackMap.has(existingKey)
  );

  store.dispatch(
    batchActions([
      ...newKeys.map((newKey) => {
        const newTrack = newTrackMap.get(newKey)!;
        return assetSongAdd({
          id: rrid<RRAssetSong>(),
          type: "song",
          name: newTrack.track_title,
          description: newTrack.flavor_text,
          duration: 10 /* min */ * 60 /* sec */ * 1000 /* ms */,
          tags: newTrack.tags,
          external: true,
          filenameOrUrl: newTrack.link,
          playerId: null,
          extra: {
            tabletopAudioKey: newKey,
          },
        });
      }),

      ...updatedKeys.map((existingKey) => {
        const existingAsset = existingTabletopAudioAssetMap.get(existingKey)!;
        const updatedTrack = newTrackMap.get(existingKey)!;
        return assetSongUpdate({
          id: existingAsset.id,
          changes: {
            name: updatedTrack.track_title,
            description: updatedTrack.flavor_text,
            tags: updatedTrack.tags,
            filenameOrUrl: updatedTrack.link,
          },
        });
      }),

      ...removedKeys.map((key) =>
        assetSongRemove(existingTabletopAudioAssetMap.get(key)!.id)
      ),
    ])
  );
  console.log(
    `Done. Added ${newKeys.length} new tracks, updated ${updatedKeys.length} existing tracks, removed ${removedKeys.length} outdated tracks.`
  );
}
