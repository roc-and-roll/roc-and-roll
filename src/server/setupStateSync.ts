import { buildPatch, isEmptyObject } from "./util";
import { MyStore } from "./setupReduxStore";
import { Server as SocketIOServer, Socket as SocketIOSocket } from "socket.io";
import { SyncedState, SyncedStateAction } from "../shared/state";

export const setupStateSync = (io: SocketIOServer, store: MyStore) => {
  const lastStateBySocket: Record<string, SyncedState | undefined> = {};
  const patchCache = new WeakMap<
    SyncedState,
    {
      patch: ReturnType<typeof buildPatch>;
      currentState: SyncedState;
    }
  >();

  const sendStateUpdate = (
    socket: SocketIOSocket,
    currentState: SyncedState
  ) => {
    const lastState = lastStateBySocket[socket.id];
    if (lastState === undefined) {
      socket.emit("SET_STATE", {
        state: JSON.stringify(currentState),
        version: __VERSION__,
      });
    } else {
      const cache = patchCache.get(lastState);
      let patch;
      if (cache && cache.currentState === currentState) {
        patch = cache.patch;
      } else {
        patch = buildPatch(lastState, currentState);
        patchCache.set(lastState, { currentState, patch });
      }
      if (!isEmptyObject(patch.patch) || patch.deletedKeys.length > 0) {
        socket.emit("PATCH_STATE", JSON.stringify(patch));
      }
    }
    lastStateBySocket[socket.id] = currentState;
  };

  const setupSocket = (socket: SocketIOSocket) => {
    console.log("A client connected");
    sendStateUpdate(socket, store.getState());

    socket.on("disconnect", () => {
      console.log("A client disconnected");
      lastStateBySocket[socket.id] = undefined;
    });
    socket.on(
      "REDUX_ACTION",
      async (actionJSON: string, sendResponse: (r: string) => void) => {
        const action = JSON.parse(actionJSON) as SyncedStateAction;
        store.dispatch(action);
      }
    );
  };

  // Setup new clients
  io.sockets.sockets.forEach(setupSocket);
  io.on("connection", setupSocket);

  store.subscribe(() => {
    const state = store.getState();
    io.sockets.sockets.forEach((socket) => {
      console.log(`sending state to ${socket.id}`);
      sendStateUpdate(socket, state);
    });
  });
};
