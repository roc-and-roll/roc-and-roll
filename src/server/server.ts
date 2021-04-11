import { setupReduxStore } from "./setupReduxStore";
import { setupStateSync } from "./setupStateSync";
import { setupWebServer } from "./setupWebServer";

const { io, url } = setupWebServer();

const store = setupReduxStore();

setupStateSync(io, store);

console.log(`Roc & Roll started at ${url}.`);

// Demo: Roll a d20 every second.
setInterval(() => {
  store.dispatch({ type: "diceRolls/rollDice", payload: 20 });
}, 1000);
