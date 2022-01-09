/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { randomColor } from "../../shared/colors";
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 1;
  migrate = (state: any) => {
    ["characters", "characterTemplates"].forEach((key) =>
      Object.values(state[key].entities).forEach((character: any) => {
        character.tokenImage = character.image;
        delete character.image;
        character.tokenBorderColor = randomColor();
      })
    );
    return state;
  };
}
