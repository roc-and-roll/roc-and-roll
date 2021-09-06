import path from "path";
import { getAudioDuration, getImageDimensions, getMimeType } from "../files";
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 8;

  private async handleObject(
    object: {
      filename: string;
      mimeType: any;
      type: any;
      duration: any;
      width: any;
      height: any;
    },
    uploadedFilesDir: string
  ) {
    const filePath = path.join(uploadedFilesDir, object.filename);
    const mimeType = await getMimeType(filePath);
    if (!mimeType) {
      throw new Error(`Could not determine mime type of ${filePath}.`);
    }
    object.mimeType = mimeType;

    if (mimeType.startsWith("audio/")) {
      object.type = "audio";
      object.duration = await getAudioDuration(filePath);
    } else if (mimeType.startsWith("image/")) {
      object.type = "image";
      const dimensions = await getImageDimensions(filePath);
      object.width = dimensions.width;
      object.height = dimensions.height;
    } else {
      object.type = "other";
    }
  }

  migrate = async (state: any, uploadedFilesDir: string) => {
    await Promise.all(
      Object.values(state.maps.entities).flatMap((map: any) =>
        Object.values(map.objects.entities).map(async (mapObject: any) => {
          if (mapObject.type === "image") {
            await this.handleObject(mapObject.image, uploadedFilesDir);
            delete mapObject.originalSize;
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
