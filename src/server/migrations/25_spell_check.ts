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
    // cSpell:enable

    return state;
  };
}
