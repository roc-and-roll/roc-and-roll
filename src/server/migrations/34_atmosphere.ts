/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 34;
  migrate = async (state: any, uploadedFilesDir: string) => {
    Object.values(
      state.maps.entities as Record<
        string,
        {
          settings: { atmosphere?: any };
        }
      >
    ).map((map) => {
      map.settings.atmosphere = { type: "none", intensity: 0 };
    });

    return state;
  };
}
