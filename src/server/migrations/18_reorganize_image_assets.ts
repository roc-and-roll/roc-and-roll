import path from "path";
import { rrid } from "../../shared/util";
import { getMimeType } from "../files";
import { AbstractMigration } from "../migrations";
import fs from "fs/promises";
import { existsSync } from "fs";

export default class extends AbstractMigration {
  version = 18;

  private handleImage(
    state: any,
    image: any,
    playerId: string,
    originalFunction: string
  ) {
    const asset = {
      id: rrid<any>(),
      name: image.filename,
      description: null,
      tags: [],
      extra: {},

      location: {
        type: "local",
        filename: image.filename,
        originalFilename: image.originalFilename,
        mimeType: image.mimeType,
      },

      type: "image",
      originalFunction,
      playerId,

      blurhash: image.blurhash,
      width: image.width,
      height: image.height,
    };

    state.assets.entities[asset.id] = asset;
    (state.assets.ids as string[]).push(asset.id);

    return asset.id;
  }

  migrate = async (state: any, uploadedFilesDir: string) => {
    Object.values(
      state.maps.entities as Record<string, { objects: any }>
    ).forEach((map) => {
      Object.values(map.objects.entities as Record<string, any>).forEach(
        (mapObject) => {
          if (mapObject.type === "image") {
            const assetId = this.handleImage(
              state,
              mapObject.image,
              mapObject.playerId,
              "map"
            );
            mapObject.imageAssetId = assetId;
            delete mapObject.image;
          }
        }
      );
    });

    const gm = Object.values(
      state.players.entities as Record<any, { id: string; isGM: boolean }>
    ).find((player) => player.isGM);
    if (!gm) {
      throw new Error("You need at least one GM to run this migration.");
    }

    ["characters", "characterTemplates"].forEach((key) => {
      Object.values(
        state[key].entities as Record<
          string,
          { id: string; tokenImage: any; tokenImageAssetId: any }
        >
      ).forEach((character) => {
        const playerId =
          Object.values(
            state.players.entities as Record<
              string,
              { characterIds: string[]; id: string }
            >
          ).find((player) => player.characterIds.includes(character.id))?.id ??
          gm.id;

        const assetId = this.handleImage(
          state,
          character.tokenImage,
          playerId,
          "token"
        );
        character.tokenImageAssetId = assetId;
        delete character.tokenImage;
      });
    });

    await Promise.all(
      Object.values(state.assets.entities as Record<string, any>).map(
        async (asset) => {
          const external = asset.external;
          const filenameOrUrl = asset.filenameOrUrl;

          if ("location" in asset) {
            return;
          }

          delete asset.external;
          delete asset.filenameOrUrl;

          asset.location = external
            ? {
                type: "external",
                url: filenameOrUrl,
              }
            : {
                type: "local",
                filename: filenameOrUrl,
                originalFilename: filenameOrUrl,
                mimeType: await getMimeType(
                  path.join(uploadedFilesDir, filenameOrUrl)
                ),
              };
        }
      )
    );

    await Promise.all(
      Object.values(state.assets.entities as Record<string, any>).map(
        async (asset) => {
          if (
            asset.location.type === "local" &&
            (asset.location.filename as string).startsWith("generated-") &&
            (asset.location.filename as string).endsWith(".svg")
          ) {
            const correctedFileName = (
              asset.location.filename as string
            ).replace(".svg", ".png");

            if (
              existsSync(
                path.join(uploadedFilesDir, asset.location.filename)
              ) &&
              !existsSync(path.join(uploadedFilesDir, correctedFileName))
            ) {
              await fs.rename(
                path.join(uploadedFilesDir, asset.location.filename),
                path.join(uploadedFilesDir, correctedFileName)
              );
            }

            if (asset.location.originalFilename === asset.location.filename) {
              asset.location.originalFilename = correctedFileName;
            }
            asset.location.filename = correctedFileName;
          }
        }
      )
    );

    return state;
  };
}
