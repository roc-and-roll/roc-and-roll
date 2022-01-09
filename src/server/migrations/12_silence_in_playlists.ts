/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 12;
  migrate = async (state: any) => {
    Object.values(state.soundSets.entities).forEach((soundSet: any) => {
      (soundSet.playlists as any[]).forEach((playlist: any) =>
        (playlist.entries as any[]).forEach(
          (playlistEntry: any) => (playlistEntry.type = "song")
        )
      );
    });

    return state;
  };
}
