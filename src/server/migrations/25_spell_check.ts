import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 25;

  // cSpell:disable
  migrate = (state: any) => {
    Object.values(
      state.players.entities as Record<
        string,
        { favoritedAssetIds?: any[]; favoriteAssetIds: any[] }
      >
    ).forEach((player) => {
      player.favoriteAssetIds ??= player.favoritedAssetIds ?? [];
      delete player.favoritedAssetIds;
    });

    Object.values(
      state.assets.entities as Record<
        string,
        { type: string; blurHash?: any; blurhash?: any }
      >
    ).forEach((asset) => {
      if (asset.type === "image") {
        asset.blurHash ??= asset.blurhash;
        delete asset.blurhash;
      }
    });
    // cSpell:enable

    return state;
  };
}
