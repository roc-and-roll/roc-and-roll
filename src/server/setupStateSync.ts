import { buildPatch, isEmptyObject } from "./util";
import { MyStore } from "./setupReduxStore";
import { Server as SocketIOServer, Socket as SocketIOSocket } from "socket.io";
import {
  byId,
  OptimisticUpdateID,
  RRPlayerID,
  SyncedState,
} from "../shared/state";
import { ephemeralPlayerAdd, ephemeralPlayerRemove } from "../shared/actions";
import { throttled } from "../shared/util";
import * as t from "typanion";
import { isRRID } from "../shared/validation";
import {
  SOCKET_PATCH_STATE,
  SOCKET_SET_PLAYER_ID,
  SOCKET_SET_STATE,
  SOCKET_DISPATCH_ACTION,
  SOCKET_BROADCAST_MSG,
} from "../shared/constants";

type AdditionalSocketData = {
  finishedOptimisticUpdateIds: OptimisticUpdateID[];
  playerId: RRPlayerID | null;
  lastState: SyncedState | null;
};

const isREDUX_ACTION = t.isObject({
  actions: t.isArray(
    t.isObject({
      type: t.isString(),
      payload: t.isUnknown(),
      meta: t.isOptional(t.isUnknown()),
      error: t.isOptional(t.isUnknown()),
    })
  ),
  optimisticUpdateId: t.isNullable(isRRID<OptimisticUpdateID>()),
});

export const setupStateSync = (
  io: SocketIOServer,
  store: MyStore,
  quiet: boolean
) => {
  const log = (...params: unknown[]) => !quiet && console.log(...params);

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
      socket.emit(SOCKET_SET_STATE, {
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
      if (
        !isEmptyObject(patch.patch) ||
        patch.deletedKeys.length > 0 ||
        data.finishedOptimisticUpdateIds.length > 0
      ) {
        socket.emit(SOCKET_PATCH_STATE, {
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
        // from ephemeral state.
        store.dispatch(ephemeralPlayerRemove(playerId));
      }
    }
  }

  function setPlayerId(data: AdditionalSocketData, playerId: RRPlayerID) {
    data.playerId = playerId;
    const existingEphermalPlayer = byId(
      store.getState().ephemeral.players.entities,
      playerId
    );
    if (!existingEphermalPlayer) {
      store.dispatch(
        ephemeralPlayerAdd({
          id: playerId,
          isOnline: true,
          mapMouse: null,
          measurePath: [],
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
      SOCKET_DISPATCH_ACTION,
      (msg: unknown, sendResponse: (r: string) => void) => {
        if (!isREDUX_ACTION(msg)) {
          console.warn("Received unsupported message from client.", msg);
          return;
        }

        const { optimisticUpdateId, actions } = msg;

        // log("actions", actions);

        if (optimisticUpdateId !== null) {
          const data = additionalSocketData.get(socket.id);
          if (!data) {
            console.error("This should never happen.");
            console.trace();
          } else {
            data.finishedOptimisticUpdateIds.push(optimisticUpdateId);
          }
        }

        actions.forEach((action) => store.dispatch(action));
      }
    );
    socket.on(
      SOCKET_SET_PLAYER_ID,
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
    socket.on(SOCKET_BROADCAST_MSG, (message) => {
      socket.broadcast.emit(SOCKET_BROADCAST_MSG, message);
    });
  };

  // Setup new clients
  io.sockets.sockets.forEach(setupSocket);
  io.on("connection", setupSocket);

  store.subscribe(
    throttled(() => {
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
