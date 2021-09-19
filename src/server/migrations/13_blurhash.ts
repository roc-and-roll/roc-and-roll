import path from "path";
import { AbstractMigration } from "../migrations";
import { calculateBlurhash } from "../files";
import pLimit from "p-limit";
import { getDefaultHeavyIOConcurrencyLimit } from "../util";

export default class extends AbstractMigration {
  version = 13;

  private async handleObject(
    object: {
      filename: string;
      mimeType: any;
      type: any;
      width: number;
      height: number;
      blurhash: string;
    },
    uploadedFilesDir: string
  ) {
    const filePath = path.join(uploadedFilesDir, object.filename);
    console.log(`Calculating blurhash for ${filePath}`);
    object.blurhash = await calculateBlurhash(filePath);
    console.log(`Blurhash for ${filePath} is ${object.blurhash}`);
  }

  migrate = async (state: any, uploadedFilesDir: string) => {
    const limit = pLimit(getDefaultHeavyIOConcurrencyLimit());

    await Promise.all([
      ...Object.values(state.maps.entities).flatMap((map: any) =>
        Object.values(map.objects.entities).map((mapObject: any) =>
          limit(async () => {
            if (mapObject.type === "image") {
              await this.handleObject(mapObject.image, uploadedFilesDir);
            }
          })
        )
      ),

      ...Object.values(state.characters.entities).map((character: any) =>
        limit(async () => {
          await this.handleObject(character.tokenImage, uploadedFilesDir);
        })
      ),

      ...Object.values(state.characterTemplates.entities).map(
        (characterTemplate: any) =>
          limit(async () => {
            await this.handleObject(
              characterTemplate.tokenImage,
              uploadedFilesDir
            );
          })
      ),
    ]);
    return state;
  };
}
