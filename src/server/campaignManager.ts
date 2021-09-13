import { CampaignEntityWithState } from "../shared/campaign";
import { Server as SocketIOServer } from "socket.io";
import { MyStore, setupReduxStore } from "./setupReduxStore";
import { setupStateSync } from "./setupStateSync";
import { isSyncedState } from "../shared/validation";
import { ephemeralPlayerUpdate } from "../shared/actions";
import { entries } from "../shared/state";
import { setupInitialState } from "./setupInitialState";
import { Knex } from "knex";
import { throttled } from "../shared/util";
import { updateCampaignState } from "./database";
import { batchActions } from "redux-batched-actions";
import { setupTabletopAudioTrackSync } from "./setupTabletopaudio";

export class CampaignManager {
  private _store?: MyStore;

  constructor(
    private readonly knex: Knex,
    private readonly io: SocketIOServer,
    private readonly quiet: boolean,
    private readonly backupPath: string,
    private readonly uploadedFilesDir: string
  ) {}

  private get store() {
    if (!this._store) {
      throw new Error("You must call begin() first!");
    }
    return this._store;
  }

  private set store(store: MyStore) {
    this._store = store;
  }

  public async begin({
    id: campaignId,
    state: initialState,
  }: CampaignEntityWithState) {
    const state = await setupInitialState(
      initialState,
      campaignId,
      this.backupPath,
      this.uploadedFilesDir
    );
    this.store = setupReduxStore(state);

    setupStateSync(campaignId, this.io, this.store, this.quiet);

    if (process.env.NODE_ENV === "development") {
      this.store.subscribe(() => {
        const errors: string[] = [];
        if (!isSyncedState(this.store.getState(), { errors })) {
          errors.forEach((error) => console.error(error));
          console.error(`
  #############################################
  #############################################

  Your state is invalid. This can lead to bugs.

  This should not have happened!

  #############################################
  #############################################`);
        }
      });
    }

    this.store.subscribe(
      throttled(async () => {
        const state = this.store.getState();
        // TODO: Using async/await here is not 100% ok.
        await updateCampaignState(this.knex, campaignId, state);
      }, 3000)
    );

    // Delete mouse position if it has not changed for some time.
    const DELETE_MOUSE_POSITION_TIME_THRESHOLD = 60 * 1000;
    setInterval(() => {
      const now = Date.now();
      const state = this.store.getState();
      this.store.dispatch(
        batchActions(
          entries(state.ephemeral.players)
            .filter(
              (each) =>
                each.mapMouse &&
                now - each.mapMouse.lastUpdate >
                  DELETE_MOUSE_POSITION_TIME_THRESHOLD
            )
            .map((each) =>
              ephemeralPlayerUpdate({
                id: each.id,
                changes: { mapMouse: null },
              })
            )
        )
      );
    }, 2000);

    await setupTabletopAudioTrackSync(this.store, this.knex, campaignId);
  }
}
