import { AbstractMigration } from "../migrations";

export default class MapObjectRotationMigration extends AbstractMigration {
  version = 4;
  migrate = (state: any) => {
    Object.entries(state.maps.entities).forEach(
      ([mapId, map]: [string, any]) => {
        const { id, objects, ...settings } = map;
        state.maps.entities[mapId] = {
          id,
          settings,
          objects,
        };
      }
    );
    return state;
  };
}
