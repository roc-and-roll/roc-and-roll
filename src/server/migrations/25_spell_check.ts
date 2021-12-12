import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 25;

  // cSpell:disable
  migrate = (state: any) => {
    ["characters", "characterTemplates"].forEach((key) =>
      Object.values(state[key].entities as { conditions: string[] }[]).forEach(
        (character) => {
          character.conditions = character.conditions.map((condition) =>
            condition === "polymorphed" ? "polyMorphed" : condition
          );
        }
      )
    );

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
