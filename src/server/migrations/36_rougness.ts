/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 36;
  migrate = (state: any) => {
    Object.values(state.maps.entities).forEach((map: any) =>
      Object.values(map.objects.entities).forEach((mapObject: any) => {
        if (mapObject.type !== "token") {
          mapObject.roughness = 3;
        }
      })
    );
    return state;
  };
}
