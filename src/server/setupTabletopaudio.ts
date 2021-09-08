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

export async function setupTabletopAudioTrackSync(store: MyStore) {
  // Update list of tabletop audio files once per day

  setInterval(
    async () => updateTabletopAudioTracks(store),
    24 * 60 * 60 * 1000
  );
  await updateTabletopAudioTracks(store);
}

async function updateTabletopAudioTracks(store: MyStore) {
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
          durationSeconds: 10 * 60,
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
