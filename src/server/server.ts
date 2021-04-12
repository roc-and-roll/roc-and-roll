import { logEntryAdd } from "../shared/actions";
import { setupReduxStore } from "./setupReduxStore";
import { setupStateSync } from "./setupStateSync";
import { setupWebServer } from "./setupWebServer";

const { io, url } = setupWebServer();

const store = setupReduxStore();

setupStateSync(io, store);

console.log(`Roc & Roll started at ${url}.`);

// Demo: Create a new log message every second
setInterval(() => {
  store.dispatch(
    logEntryAdd({
      type: "message",
      playerId: "foo",
      silent: false,
      timestamp: Date.now(),
      payload: {
        text: "Test log message",
      },
    })
  );
}, 1000);
