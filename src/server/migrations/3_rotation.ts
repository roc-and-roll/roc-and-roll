/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 3;
  migrate = (state: any) => {
    Object.values(state.maps.entities).forEach((map: any) =>
      Object.values(map.objects.entities).forEach(
        (mapObject: any) => (mapObject.rotation = 0)
      )
    );
    return state;
  };
}
