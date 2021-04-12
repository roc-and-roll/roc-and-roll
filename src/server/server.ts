import { logEntryMessageAdd } from "../shared/actions";
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
    logEntryMessageAdd({
      playerId: "foo",
      silent: false,
      payload: {
        text: "Test log message",
      },
    })
  );
}, 1000);
