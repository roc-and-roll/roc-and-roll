import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 26;

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

    Object.values(
      state.characters.entities as Record<string, { ac: any; AC: any }>
    ).forEach((character) => {
      if (character.ac === undefined) character.ac = character.AC ?? null;
      delete character.AC;
    });
    Object.values(
      state.characterTemplates.entities as Record<string, { ac: any; AC: any }>
    ).forEach((character) => {
      if (character.ac === undefined) character.ac = character.AC ?? null;
      delete character.AC;
    });
    // cSpell:enable

    return state;
  };
}
