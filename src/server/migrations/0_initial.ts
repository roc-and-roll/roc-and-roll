import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 0;
  migrate = (state: any) => state;
}
