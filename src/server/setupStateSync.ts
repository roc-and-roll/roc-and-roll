import { buildPatch, isEmptyObject } from "./util";
import { MyStore } from "./setupReduxStore";
import { Server as SocketIOServer, Socket as SocketIOSocket } from "socket.io";
import {
  OptimisticUpdateID,
  SyncedState,
  SyncedStateAction,
} from "../shared/state";

export const setupStateSync = (io: SocketIOServer, store: MyStore) => {
  const finishedOptimisticUpdateIdsBySocket: Record<
    string,
    Set<OptimisticUpdateID>
  > = {};

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
    const finishedOptimisticUpdateIds = [
      ...finishedOptimisticUpdateIdsBySocket[socket.id]!,
    ];
    if (lastState === undefined) {
      socket.emit("SET_STATE", {
        state: JSON.stringify(currentState),
        version: __VERSION__,
        finishedOptimisticUpdateIds,
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
        socket.emit("PATCH_STATE", {
          patch: JSON.stringify(patch),
          finishedOptimisticUpdateIds,
        });
      }
    }
    finishedOptimisticUpdateIdsBySocket[socket.id]!.clear();
    lastStateBySocket[socket.id] = currentState;
  };

  const setupSocket = (socket: SocketIOSocket) => {
    finishedOptimisticUpdateIdsBySocket[socket.id] = new Set();
    console.log("A client connected");
    sendStateUpdate(socket, store.getState());

    socket.on("disconnect", () => {
      console.log("A client disconnected");
      delete lastStateBySocket[socket.id];
      delete finishedOptimisticUpdateIdsBySocket[socket.id];
    });
    socket.on(
      "REDUX_ACTION",
      async (actionJSON: string, sendResponse: (r: string) => void) => {
        const action = JSON.parse(actionJSON) as SyncedStateAction;
        if (action.meta?.__optimisticUpdateId__) {
          finishedOptimisticUpdateIdsBySocket[socket.id]!.add(
            action.meta.__optimisticUpdateId__
          );
        }
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
