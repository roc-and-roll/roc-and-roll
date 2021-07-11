import { MyStore } from "./setupReduxStore";
import fs from "fs";
import { throttled } from "../shared/util";

export function setupStatePersistence(store: MyStore, statePath: string) {
  store.subscribe(
    throttled(() => {
      const state = store.getState();
      const json = JSON.stringify(state);

      // TODO: We cannot really use async, because then we might lag behind on
      // multiple rapid state updates.
      //
      // Also, we should really use the writeFileAtomic (npm library) here.
      fs.writeFileSync(statePath, json, { encoding: "utf-8" });
    }, 3000)
  );
}
