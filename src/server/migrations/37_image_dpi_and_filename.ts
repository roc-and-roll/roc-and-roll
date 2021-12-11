import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 37;

  migrate = (state: any) => {
    Object.values(
      state.assets.entities as Record<
        string,
        { name: string; type: string; dpi: any; location: any }
      >
    ).forEach((asset) => {
      if (asset.type === "image") {
        asset.dpi ??= null;
      }
      if (asset.location.type === "local") {
        asset.name = asset.location.originalFilename;
      }
    });

    return state;
  };
}
