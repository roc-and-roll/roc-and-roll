/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 9;
  migrate = (state: any) => {
    Object.values(state.assets.entities).forEach((asset: any) => {
      asset.description = null;
      asset.extra = {};
    });

    return state;
  };
}
