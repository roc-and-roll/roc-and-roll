import { buildPatch, isEmptyObject } from "./util";
import { MyStore } from "./setupReduxStore";
import { Server as SocketIOServer, Socket as SocketIOSocket } from "socket.io";
import {
  OptimisticUpdateID,
  RRPlayer,
  RRPlayerID,
  SyncedState,
} from "../shared/state";
import { ephemeralPlayerAdd, ephemeralPlayerRemove } from "../shared/actions";
import { throttled } from "../shared/util";
import * as z from "zod";
import { isRRID } from "../shared/validation";
import {
  SOCKET_PATCH_STATE,
  SOCKET_SET_PLAYER_ID,
  SOCKET_SET_STATE,
  SOCKET_DISPATCH_ACTION,
  SOCKET_BROADCAST_MSG,
  SOCKET_SERVER_INFO,
} from "../shared/constants";
import { batchActions } from "redux-batched-actions";
import { ClientBuildHashSubject } from "./setupClientBuildHashSubject";

interface AdditionalSocketData {
  finishedOptimisticUpdateIds: OptimisticUpdateID[];
  playerId: RRPlayerID | null;
  lastState: SyncedState | null;
}

const isREDUX_ACTION = z.strictObject({
  actions: z.array(
    z.strictObject({
      type: z.string(),
      payload: z.unknown(),
      meta: z.optional(z.unknown()),
      error: z.optional(z.unknown()),
    })
  ),
  optimisticUpdateId: z.nullable(isRRID<OptimisticUpdateID>()),
});

export const setupStateSync = (
  io: SocketIOServer,
  store: MyStore,
  clientBuildHashSubject: ClientBuildHashSubject,
  quiet: boolean
) => {
  const log = (...params: unknown[]) => !quiet && console.log(...params);

  const additionalSocketData = new Map<
    string /* socket id */,
    AdditionalSocketData
  >();

  clientBuildHashSubject.subscribe(() => {
    io.sockets.sockets.forEach(sendServerInfo);
  });

  const patchCache = new WeakMap<
    SyncedState,
    {
      patch: ReturnType<typeof buildPatch>;
      currentState: SyncedState;
    }
  >();

  const sendServerInfo = (socket: SocketIOSocket) => {
    socket.emit(SOCKET_SERVER_INFO, {
      clientBuildHash: clientBuildHashSubject.getValue(),
      version: __VERSION__,
      env: process.env.NODE_ENV,
    });
  };

  const sendStateUpdate = (
    socket: SocketIOSocket,
    currentState: SyncedState,
    player: RRPlayer | null
  ) => {
    const data = additionalSocketData.get(socket.id);
    if (!data) {
      console.error("This should never happen.");
      console.trace();
      return;
    }

    if (data.lastState === null) {
      log(
        `[${Date.now() / 1000}] sending state to ${socket.id} (${
          player?.name ?? "not logged in"
        })`
      );
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
        log(
          `[${Date.now() / 1000}] sending state to ${socket.id} (${
            player?.name ?? "not logged in"
          })`
        );
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
    const existingEphemeralPlayer =
      store.getState().ephemeral.players.entities[playerId];
    if (!existingEphemeralPlayer) {
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
    sendServerInfo(socket);
    sendStateUpdate(socket, store.getState(), null);

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
        const validationResult = isREDUX_ACTION.safeParse(msg);
        if (!validationResult.success) {
          console.warn(
            "Received unsupported message from client.",
            msg,
            validationResult.error.message
          );
          return;
        }

        const { optimisticUpdateId, actions } = validationResult.data;

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

        store.dispatch(batchActions(actions));
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
          ? state.players.entities[data.playerId] ?? null
          : null;

        sendStateUpdate(socket, state, player);
      });
    }, 100)
  );
};
