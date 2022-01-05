import path from "path";
import fs from "fs";
import { assetRemove, assetSongAdd, assetSongUpdate } from "../shared/actions";
import { entries } from "../shared/state";
import { partition } from "../shared/util";
import { MyStore } from "./setupReduxStore";
import fetch from "node-fetch";
import {
  isTabletopAudioAsset,
  isTabletopAudioIndex,
  TabletopAudioIndex,
} from "../shared/tabletopAudio";
import { batchActions } from "redux-batched-actions";
import envPaths from "env-paths";
import lockfile from "proper-lockfile";

export async function setupTabletopAudioTrackSync(store: MyStore) {
  const updater = new TabletopAudioDownloader(store);
  await updater.begin();
}

class TabletopAudioDownloader {
  private readonly CACHE_DIR = envPaths("roc-and-roll").cache;

  private readonly CONTENT_FILE = "tabletop-audio.json";
  private readonly TIMESTAMP_FILE = "last-tabletop-audio-update.txt";
  private readonly LOCK_FILE = "tabletop-audio-update.lock";
  private readonly UPDATE_INTERVAL = 24 * 60 * 60 * 1000;

  constructor(private readonly store: MyStore) {}

  public async begin() {
    if (
      process.env.NODE_ENV === "test" ||
      process.env.NODE_ENV === "e2e-test"
    ) {
      // Do not fetch tabletop audio in tests.
      return;
    }

    await fs.promises.mkdir(this.CACHE_DIR, { recursive: true });
    this.log(`Using cache directory ${this.CACHE_DIR}`);

    await this.updateTabletopAudioTracks();
    setInterval(
      async () => this.updateTabletopAudioTracks(),
      this.UPDATE_INTERVAL
    );
  }

  private async updateTabletopAudioTracks() {
    const audioIndex = await this.getTabletopAudioIndex();
    if (audioIndex !== null) {
      this.updateTabletopAudioTracksInStore(audioIndex);
    }
  }

  private async getTabletopAudioIndex() {
    this.log("Checking if tabletop audio index is stale.");

    return this.withLock(async () => {
      // Update list of tabletop audio files at most once per day.
      if (
        (await this.getLastUpdateAttempt()) >=
        new Date(Date.now() - 60 * 60 * 1000)
      ) {
        return this.getCachedAudioIndex();
      }

      this.log("Refreshing tabletop audio index.");

      await this.rememberUpdateAttempt();

      let result;
      try {
        result = await fetch("https://tabletopaudio.com/tta_data");
      } catch (err) {
        this.error("Error fetching tabletop audio song index.");
        this.error(String(err));
        return null;
      }

      if (result.status !== 200) {
        this.error(
          "Error fetching tabletop audio song index. Status code is not 200:"
        );
        this.error(result.statusText);
        return null;
      }

      const json = await result.json();
      const errors: string[] = [];
      if (!isTabletopAudioIndex(json, { errors })) {
        this.error("Error parsing tabletop audio song index.");
        errors.forEach((error) => this.error(error));
        return null;
      }

      await fs.promises.writeFile(
        path.join(this.CACHE_DIR, this.CONTENT_FILE),
        JSON.stringify(json),
        "utf-8"
      );

      this.log("Written tabletop audio index to cache.");

      return json;
    });
  }

  private async getCachedAudioIndex() {
    try {
      const cachedAudioIndexJSON = await fs.promises.readFile(
        path.join(this.CACHE_DIR, this.CONTENT_FILE),
        "utf-8"
      );
      const cachedAudioIndex = JSON.parse(cachedAudioIndexJSON);
      if (!isTabletopAudioIndex(cachedAudioIndex)) {
        throw new Error("Invalid cached audio index file.");
      }
      return cachedAudioIndex;
    } catch (err) {
      this.error(String(err));
      return null;
    }
  }

  private updateTabletopAudioTracksInStore(json: TabletopAudioIndex) {
    this.log("Updating tabletop audio tracks in state.");

    const newTrackMap = new Map(json.tracks.map((track) => [track.key, track]));

    const existingTabletopAudioAssetMap = new Map(
      entries(this.store.getState().assets).flatMap((existingAsset) => {
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

    this.store.dispatch(
      batchActions([
        ...newKeys.map((newKey) => {
          const newTrack = newTrackMap.get(newKey)!;
          return assetSongAdd({
            type: "song",
            name: newTrack.track_title,
            description: newTrack.flavor_text,
            duration: 10 /* min */ * 60 /* sec */ * 1000 /* ms */,
            tags: newTrack.tags,
            location: {
              type: "external",
              url: newTrack.link,
            },
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
              location: {
                type: "external",
                url: updatedTrack.link,
              },
            },
          });
        }),

        ...removedKeys.map((key) =>
          assetRemove(existingTabletopAudioAssetMap.get(key)!.id)
        ),
      ])
    );
    this.log(
      `Done. Added ${newKeys.length} new tracks, updated ${updatedKeys.length} existing tracks, removed ${removedKeys.length} outdated tracks.`
    );
  }

  private async rememberUpdateAttempt() {
    await fs.promises.writeFile(
      path.join(this.CACHE_DIR, this.TIMESTAMP_FILE),
      new Date().toISOString(),
      "utf-8"
    );
  }

  private async getLastUpdateAttempt(): Promise<Date> {
    try {
      const lastUpdateAttempt = await fs.promises.readFile(
        path.join(this.CACHE_DIR, this.TIMESTAMP_FILE),
        "utf-8"
      );
      return new Date(lastUpdateAttempt);
    } catch (e) {
      return new Date(0);
    }
  }

  private async withLock<T>(fn: () => Promise<T>) {
    const lockfilePath = path.join(this.CACHE_DIR, this.LOCK_FILE);
    this.log(`Acquiring lock: ${lockfilePath}`);
    const releaseLock = await lockfile.lock(this.CACHE_DIR, {
      lockfilePath,
    });
    this.log("Lock acquired.");
    try {
      return await fn();
    } finally {
      await releaseLock();
      this.log("Lock released.");
    }
  }

  private log(msg: string) {
    console.log(`[TabletopAudioDownloader] ${msg}`);
  }

  private error(msg: string) {
    console.error(`[TabletopAudioDownloader] ${msg}`);
  }
}
