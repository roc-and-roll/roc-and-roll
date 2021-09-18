import path from "path";
import { AbstractMigration } from "../migrations";
import { calculateBlurhash } from "../files";

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
    await Promise.all(
      Object.values(state.maps.entities).flatMap((map: any) =>
        Object.values(map.objects.entities).map(async (mapObject: any) => {
          if (mapObject.type === "image") {
            await this.handleObject(mapObject.image, uploadedFilesDir);
          }
        })
      )
    );

    await Promise.all(
      Object.values(state.characters.entities).map(async (character: any) => {
        await this.handleObject(character.tokenImage, uploadedFilesDir);
      })
    );

    await Promise.all(
      Object.values(state.characterTemplates.entities).map(
        async (characterTemplate: any) => {
          await this.handleObject(
            characterTemplate.tokenImage,
            uploadedFilesDir
          );
        }
      )
    );

    return state;
  };
}
