import path from "path";
import { AbstractMigration } from "../migrations";
import { normalizeLoudnessAndConvertToMP3 } from "../files";
import pLimit from "p-limit";
import { getDefaultHeavyIOConcurrencyLimit } from "../util";

export default class extends AbstractMigration {
  version = 14;

  migrate = async (state: any, uploadedFilesDir: string) => {
    console.log("Normalizing loudness of audio files. This may take a while.");

    const limit = pLimit(getDefaultHeavyIOConcurrencyLimit());

    await Promise.all(
      Object.values(state.assets.entities).map((asset: any) => {
        if (asset.external) {
          return;
        }

        return limit(async () => {
          const filePath = path.join(uploadedFilesDir, asset.filenameOrUrl);
          const normalizedFileName =
            path.parse(asset.filenameOrUrl).name + ".normalized.mp3";
          const normalizedFilePath = path.join(
            uploadedFilesDir,
            normalizedFileName
          );
          await normalizeLoudnessAndConvertToMP3(filePath, normalizedFilePath);
          asset.filenameOrUrl = normalizedFileName;

          console.log(
            `${limit.activeCount - 1 + limit.pendingCount} files remaining.`
          );
        });
      })
    );

    return state;
  };
}
