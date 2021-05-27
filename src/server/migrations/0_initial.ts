import { AbstractMigration } from "../migrations";

export default class InitialMigration extends AbstractMigration {
  version = 0;
  migrate = (state: any) => state;
}
