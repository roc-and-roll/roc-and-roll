/* eslint-disable @typescript-eslint/no-unsafe-argument */
import path from "path";
import { getAudioDuration } from "../files";
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 11;
  migrate = async (state: any, uploadedFilesDir: string) => {
    await Promise.all(
      Object.values(state.assets.entities).map(async (asset: any) => {
        const filePath = path.join(uploadedFilesDir, asset.filenameOrUrl);
        asset.duration = asset.external
          ? asset.durationSeconds * 1000
          : await getAudioDuration(filePath);
        delete asset.durationSeconds;
      })
    );

    return state;
  };
}
