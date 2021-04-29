import { buildPatch, isEmptyObject } from "./util";
import { MyStore } from "./setupReduxStore";
import { Server as SocketIOServer, Socket as SocketIOSocket } from "socket.io";
import {
  byId,
  OptimisticUpdateID,
  RRPlayerID,
  SyncedState,
  SyncedStateAction,
} from "../shared/state";
import { ephermalPlayerAdd, ephermalPlayerRemove } from "../shared/actions";
import { debounced } from "../shared/util";

const quiet = !!process.env["QUIET"];
const log = (...params: any[]) => !quiet && console.log(...params);

type AdditionalSocketData = {
  finishedOptimisticUpdateIds: OptimisticUpdateID[];
  playerId: RRPlayerID | null;
  lastState: SyncedState | null;
};

export const setupStateSync = (io: SocketIOServer, store: MyStore) => {
  const additionalSocketData = new Map<
    string /* socket id */,
    AdditionalSocketData
  >();

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
    const data = additionalSocketData.get(socket.id);
    if (!data) {
      console.error("This should never happen.");
      console.trace();
      return;
    }

    if (data.lastState === null) {
      socket.emit("SET_STATE", {
        state: JSON.stringify(currentState),
        version: __VERSION__,
        finishedOptimisticUpdateIds: data.finishedOptimisticUpdateIds,
      });
    } else {
      const cache = patchCache.get(data.lastState);
      let patch;
      if (cache && cache.currentState === currentState) {
        patch = cache.patch;
      } else {
        patch = buildPatch(data.lastState, currentState);
        patchCache.set(data.lastState, { currentState, patch });
      }
      if (!isEmptyObject(patch.patch) || patch.deletedKeys.length > 0) {
        socket.emit("PATCH_STATE", {
          patch: JSON.stringify(patch),
          finishedOptimisticUpdateIds: data.finishedOptimisticUpdateIds,
        });
      }
    }
    data.finishedOptimisticUpdateIds = [];
    data.lastState = currentState;
  };

  function setPlayerIdToNull(data: AdditionalSocketData) {
    const playerId = data.playerId;
    if (playerId) {
      data.playerId = null;

      if (
        ![...additionalSocketData.values()].some(
          (each) => each.playerId === playerId
        )
      ) {
        // If the player is not connected to any other socket, remove them
        // from ephermal state.
        store.dispatch(ephermalPlayerRemove(playerId));
      }
    }
  }

  function setPlayerId(data: AdditionalSocketData, playerId: RRPlayerID) {
    data.playerId = playerId;
    const existingEphermalPlayer = byId(
      store.getState().ephermal.players.entities,
      playerId
    );
    if (!existingEphermalPlayer) {
      store.dispatch(
        ephermalPlayerAdd({
          id: playerId,
          isOnline: true,
          mapMouse: null,
          tokenPath: [],
        })
      );
    }
  }

  const setupSocket = (socket: SocketIOSocket) => {
    additionalSocketData.set(socket.id, {
      finishedOptimisticUpdateIds: [],
      lastState: null,
      playerId: null,
    });

    log("A client connected");
    sendStateUpdate(socket, store.getState());

    socket.on("disconnect", () => {
      log("A client disconnected");
      const data = additionalSocketData.get(socket.id);
      if (!data) {
        console.error("This should never happen.");
        console.trace();
        return;
      }
      setPlayerIdToNull(data);
      additionalSocketData.delete(socket.id);
    });
    socket.on(
      "REDUX_ACTION",
      (
        actionOrActions: SyncedStateAction | SyncedStateAction[],
        sendResponse: (r: string) => void
      ) => {
        // log("actions", actionOrActions);
        const actions = Array.isArray(actionOrActions)
          ? actionOrActions
          : [actionOrActions];

        actions.forEach((action) => {
          if (action.meta?.__optimisticUpdateId__) {
            const data = additionalSocketData.get(socket.id);
            if (!data) {
              console.error("This should never happen.");
              console.trace();
            } else {
              data.finishedOptimisticUpdateIds.push(
                action.meta.__optimisticUpdateId__
              );
            }
          }
          store.dispatch(action);
        });
      }
    );
    socket.on(
      "SET_PLAYER_ID",
      async (
        playerId: RRPlayerID | null,
        sendResponse: (r: string) => void
      ) => {
        const data = additionalSocketData.get(socket.id);
        if (!data) {
          console.error("This should never happen.");
          console.trace();
          return;
        }

        data.playerId = playerId;

        if (playerId === null) {
          setPlayerIdToNull(data);
        } else {
          setPlayerId(data, playerId);
        }
      }
    );
  };

  // Setup new clients
  io.sockets.sockets.forEach(setupSocket);
  io.on("connection", setupSocket);

  store.subscribe(
    debounced(() => {
      const state = store.getState();
      io.sockets.sockets.forEach((socket) => {
        const data = additionalSocketData.get(socket.id);
        const player = data?.playerId
          ? byId(state.players.entities, data.playerId) ?? null
          : null;

        log(
          `[${Date.now() / 1000}] sending state to ${socket.id} (${
            player?.name ?? "not logged in"
          })`
        );
        sendStateUpdate(socket, state);
      });
    }, 100)
  );
};
