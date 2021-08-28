import { DeepPartial } from "@reduxjs/toolkit";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
import { Socket } from "socket.io-client";
import { Opaque } from "type-fest";
import {
  SOCKET_PATCH_STATE,
  SOCKET_SET_PLAYER_ID,
  SOCKET_SET_STATE,
  SOCKET_DISPATCH_ACTION,
  USE_CONCURRENT_MODE,
} from "../shared/constants";
import { reducer } from "../shared/reducer";
import {
  initialSyncedState,
  OptimisticUpdateID,
  RRID,
  RRPlayerID,
  SyncedState,
  SyncedStateAction,
} from "../shared/state";
import { mergeDeep, rrid } from "../shared/util";
import { useGuranteedMemo } from "./useGuranteedMemo";
import { useLatest } from "./useLatest";

type DeduplicationKey = Opaque<string, "optimisticDeduplicationKey">;

class OptimisticActionAppliers {
  private readonly byDeduplicationKey = new Map<
    DeduplicationKey,
    OptimisticActionApplier
  >();
  private readonly byId = new Map<
    OptimisticUpdateID,
    Set<OptimisticActionApplier>
  >();

  public add(applier: OptimisticActionApplier) {
    const deduplicationKey =
      OptimisticActionAppliers.getDeduplicationKey(applier);
    {
      const oldApplier = this.byDeduplicationKey.get(deduplicationKey);
      if (oldApplier) {
        this.byDeduplicationKey.delete(deduplicationKey);
        const oldAppliers = this.byId.get(oldApplier.optimisticUpdateId);
        if (oldAppliers) {
          oldAppliers.delete(oldApplier);
          if (oldAppliers.size === 0) {
            this.byId.delete(oldApplier.optimisticUpdateId);
          }
        }
      }
    }

    this.byDeduplicationKey.set(deduplicationKey, applier);

    const currentAppliers =
      this.byId.get(applier.optimisticUpdateId) ?? new Set();
    if (currentAppliers.size === 0) {
      this.byId.set(applier.optimisticUpdateId, currentAppliers);
    }
    currentAppliers.add(applier);
  }

  public deleteByOptimisticUpdateId(id: OptimisticUpdateID): boolean {
    const appliers = this.byId.get(id);
    if (!appliers) {
      return false;
    }

    for (const applier of appliers.values()) {
      const deduplicationKey =
        OptimisticActionAppliers.getDeduplicationKey(applier);
      this.byDeduplicationKey.delete(deduplicationKey);
    }

    this.byId.delete(id);

    return true;
  }

  public appliers(): OptimisticActionApplier[] {
    return Array.from(this.byDeduplicationKey.values());
  }

  public static getDeduplicationKey(
    applier: Pick<OptimisticActionApplier, "dispatcherKey" | "key">
  ): DeduplicationKey {
    return `${applier.dispatcherKey}/${applier.key ?? ""}` as DeduplicationKey;
  }
}

export type StatePatch<D> = {
  patch: DeepPartial<D>;
  deletedKeys: string[];
};

type StateUpdateSubscriber = (newState: SyncedState) => void;

type OptimisticUpdateExecutedSubscriber = (
  optimisticUpdateIds: OptimisticUpdateID[]
) => void;

type OptimisticActionApplier = {
  readonly key?: string;
  readonly optimisticUpdateId: OptimisticUpdateID;
  readonly dispatcherKey: RRID;
  readonly actions: ReadonlyArray<SyncedStateAction>;
};

const DEBUG = false as boolean;

// This context is subscribed to using the useServerState and useServerDispatch
// hooks. It is deliberately not exported. The context must not change on state
// updates (that means, e.g., that it cannot contain the state object itself),
// because that would cause all subscribed components to re-render on every
// state update, regardless of what piece of the state they are interested in.
//
// Instead, the context contains a reference to the state, which the hooks can
// use to get the current state when executing the hook, but which can not be
// used to re-render the component using the hook on updates.
// To re-render components when a selected part of the state changes, the
// useServerState hook subscribes and unsubscribes to state changes through the
// context and uses useState internally.
const ServerStateContext = React.createContext<{
  subscribe: (subscriber: StateUpdateSubscriber) => void;
  unsubscribe: (subscriber: StateUpdateSubscriber) => void;
  subscribeToOptimisticUpdateExecuted: (
    subscriber: OptimisticUpdateExecutedSubscriber
  ) => void;
  unsubscribeToOptimisticUpdateExecuted: (
    subscriber: OptimisticUpdateExecutedSubscriber
  ) => void;
  stateRef: React.MutableRefObject<SyncedState>;
  socket: Socket | null;
  addLocalOptimisticActionAppliers: (
    appliers: OptimisticActionApplier[]
  ) => void;
}>({
  subscribe: () => {},
  unsubscribe: () => {},
  subscribeToOptimisticUpdateExecuted: () => {},
  unsubscribeToOptimisticUpdateExecuted: () => {},
  stateRef: { current: initialSyncedState },
  socket: null,
  addLocalOptimisticActionAppliers: () => {},
});
ServerStateContext.displayName = "ServerStateContext";

type ReconnectionAttemptSubscriber = () => void;

const ServerConnectionContext = React.createContext<{
  connected: boolean;
  subscribeToReconnectAttempts: (
    subscriber: ReconnectionAttemptSubscriber
  ) => void;
  unsubscribeFromReconnectAttempts: (
    subscriber: ReconnectionAttemptSubscriber
  ) => void;
}>({
  connected: false,
  subscribeToReconnectAttempts: () => {},
  unsubscribeFromReconnectAttempts: () => {},
});

export function useServerConnection() {
  return useContext(ServerConnectionContext);
}

function ServerConnectionProvider({
  socket,
  children,
}: React.PropsWithChildren<{ socket: Socket }>) {
  const [connected, setConnected] = useState(socket.connected);
  const subscribers = useRef<Set<ReconnectionAttemptSubscriber>>(new Set());

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onAttemptReconnect = () =>
      subscribers.current.forEach((subscriber) => subscriber());

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect_attempt", onAttemptReconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect_attempt", onAttemptReconnect);
    };
  }, [socket]);

  const subscribeToReconnectAttempts = useCallback(
    (subscriber: ReconnectionAttemptSubscriber) =>
      subscribers.current.add(subscriber),
    []
  );
  const unsubscribeFromReconnectAttempts = useCallback(
    (subscriber: ReconnectionAttemptSubscriber) =>
      subscribers.current.delete(subscriber),
    []
  );

  const ctx = useGuranteedMemo(
    () => ({
      connected,
      subscribeToReconnectAttempts,
      unsubscribeFromReconnectAttempts,
    }),
    [connected, subscribeToReconnectAttempts, unsubscribeFromReconnectAttempts]
  );

  return (
    <ServerConnectionContext.Provider value={ctx}>
      {children}
    </ServerConnectionContext.Provider>
  );
}

const batchUpdatesIfNotConcurrentMode = (cb: () => void) => {
  if (USE_CONCURRENT_MODE) {
    return cb();
  } else {
    ReactDOM.unstable_batchedUpdates(() => {
      cb();
    });
  }
};

export function ServerStateProvider({
  socket,
  children,
}: React.PropsWithChildren<{ socket: Socket }>) {
  // We must not useState in this component, because we do not want to cause
  // re-renders of this component and its children when the state changes.
  const internalStateRef = useRef<SyncedState>(initialSyncedState);
  const internalServerStateRef = useRef<SyncedState>(internalStateRef.current);
  const externalStateRef = useRef<SyncedState>(internalStateRef.current);
  const finishedOptimisticUpdateIdsRef = useRef<OptimisticUpdateID[]>([]);
  const subscribers = useRef<Set<StateUpdateSubscriber>>(new Set());
  const subscribersToOptimisticUpdatesExecuted = useRef<
    Set<OptimisticUpdateExecutedSubscriber>
  >(new Set());
  const optimisticActionAppliers = useRef<OptimisticActionAppliers>(
    new OptimisticActionAppliers()
  );

  const propagationAnimationFrameRef = useRef<number | null>(null);

  const propagateStateChange = useCallback((forceSync: boolean) => {
    const update = () => {
      const state = (externalStateRef.current = internalStateRef.current);
      const finishedOptimisticUpdateIds =
        finishedOptimisticUpdateIdsRef.current;
      finishedOptimisticUpdateIdsRef.current = [];

      batchUpdatesIfNotConcurrentMode(() =>
        subscribers.current.forEach((subscriber) => subscriber(state))
      );
      batchUpdatesIfNotConcurrentMode(() =>
        subscribersToOptimisticUpdatesExecuted.current.forEach((subscriber) =>
          subscriber(finishedOptimisticUpdateIds)
        )
      );
    };
    if (process.env.NODE_ENV === "test" || forceSync) {
      update();
    } else {
      propagationAnimationFrameRef.current ??= requestAnimationFrame(() => {
        update();
        propagationAnimationFrameRef.current = null;
        if (externalStateRef.current !== internalStateRef.current) {
          propagateStateChange(forceSync);
        }
      });
    }
  }, []);

  const addOptimisticUpdateIds = useCallback(
    (finishedOptimisticUpdateIds: ReadonlyArray<OptimisticUpdateID>) => {
      finishedOptimisticUpdateIdsRef.current = [
        ...finishedOptimisticUpdateIdsRef.current,
        ...finishedOptimisticUpdateIds,
      ];
    },
    []
  );

  const removeFinishedOptimisticUpdateAppliers = useCallback(
    (finishedOptimisticUpdateIds: ReadonlyArray<OptimisticUpdateID>) =>
      finishedOptimisticUpdateIds.filter(
        (id) => !optimisticActionAppliers.current.deleteByOptimisticUpdateId(id)
      ),
    []
  );

  const applyOptimisticUpdateAppliers = useCallback(
    (state: SyncedState): SyncedState => {
      // console.table(
      //   optimisticActionAppliers.current.appliers().map((applier) => ({
      //     deduplicationKey:
      //       OptimisticActionAppliers.getDeduplicationKey(applier),
      //     optimisticUpdateId: applier.optimisticUpdateId,
      //     actions: applier.actions,
      //   }))
      // );

      return optimisticActionAppliers.current
        .appliers()
        .reduce(
          (state, applier) =>
            applier.actions.reduce(
              (state, action) => reducer(state, action),
              state
            ),
          state
        );
    },
    []
  );

  const updateState = useCallback(
    (finishedOptimisticUpdateIds: OptimisticUpdateID[], forceSync = false) => {
      removeFinishedOptimisticUpdateAppliers(finishedOptimisticUpdateIds);

      internalStateRef.current = applyOptimisticUpdateAppliers(
        internalServerStateRef.current
      );
      addOptimisticUpdateIds(finishedOptimisticUpdateIds);
      propagateStateChange(forceSync);
    },
    [
      addOptimisticUpdateIds,
      applyOptimisticUpdateAppliers,
      propagateStateChange,
      removeFinishedOptimisticUpdateAppliers,
    ]
  );

  useEffect(() => {
    const onSetState = (msg: {
      state: string;
      finishedOptimisticUpdateIds: OptimisticUpdateID[];
    }) => {
      const state = (internalServerStateRef.current = JSON.parse(
        msg.state
      ) as SyncedState);

      process.env.NODE_ENV === "development" &&
        DEBUG &&
        console.log(
          "Server -> Client | SET_STATE | state = ",
          state,
          "finishedOptimisticUpdateIds = ",
          msg.finishedOptimisticUpdateIds
        );

      updateState(msg.finishedOptimisticUpdateIds);
    };

    const onPatchState = (msg: {
      patch: string;
      finishedOptimisticUpdateIds: OptimisticUpdateID[];
    }) => {
      const patch = JSON.parse(msg.patch) as StatePatch<SyncedState>;
      process.env.NODE_ENV === "development" &&
        DEBUG &&
        console.log(
          "Server -> Client | PATCH_STATE | patch = ",
          patch,
          "finishedOptimisticUpdateIds = ",
          msg.finishedOptimisticUpdateIds
        );

      internalServerStateRef.current = applyStatePatch(
        internalServerStateRef.current,
        patch
      );

      updateState(msg.finishedOptimisticUpdateIds);
    };

    socket.on(SOCKET_SET_STATE, onSetState);
    socket.on(SOCKET_PATCH_STATE, onPatchState);

    return () => {
      socket.off(SOCKET_SET_STATE, onSetState);
      socket.off(SOCKET_PATCH_STATE, onPatchState);
    };
  }, [socket, updateState]);

  const subscribe = useCallback((subscriber: StateUpdateSubscriber) => {
    subscribers.current.add(subscriber);
  }, []);

  const unsubscribe = useCallback((subscriber: StateUpdateSubscriber) => {
    subscribers.current.delete(subscriber);
  }, []);

  const subscribeToOptimisticUpdateExecuted = useCallback(
    (subscriber: OptimisticUpdateExecutedSubscriber) => {
      subscribersToOptimisticUpdatesExecuted.current.add(subscriber);
    },
    []
  );

  const unsubscribeToOptimisticUpdateExecuted = useCallback(
    (subscriber: OptimisticUpdateExecutedSubscriber) => {
      subscribersToOptimisticUpdatesExecuted.current.delete(subscriber);
    },
    []
  );

  const addLocalOptimisticActionAppliers = useCallback(
    (appliers: OptimisticActionApplier[]) => {
      if (appliers.length === 0) {
        return;
      }

      appliers.forEach((applier) =>
        optimisticActionAppliers.current.add(applier)
      );

      updateState([], true);
    },
    [updateState]
  );

  return (
    <ServerStateContext.Provider
      value={{
        stateRef: externalStateRef,
        subscribe,
        unsubscribe,
        subscribeToOptimisticUpdateExecuted,
        unsubscribeToOptimisticUpdateExecuted,
        socket,
        addLocalOptimisticActionAppliers,
      }}
    >
      <ServerConnectionProvider socket={socket}>
        {children}
      </ServerConnectionProvider>
    </ServerStateContext.Provider>
  );
}

export function applyStatePatch(
  state: SyncedState,
  patchData: StatePatch<SyncedState>
) {
  const { patch, deletedKeys } = patchData;
  const patchedState = mergeDeep<SyncedState>(state, patch);
  deletedKeys.forEach((deletedKey) => {
    const parts = deletedKey.split(".");
    let element: any = patchedState;
    parts.forEach((part, idx) => {
      if (idx === parts.length - 1) {
        delete element[part];
      } else {
        element = element[part];
      }
    });
  });
  process.env.NODE_ENV === "development" &&
    DEBUG &&
    console.log("Server -> Client | PATCH_STATE | state = ", patchedState);
  return patchedState;
}

////////////////////////////////////////////////////////////////////////////////
// Hooks
////////////////////////////////////////////////////////////////////////////////

/**
 * Get a piece of the server state. Will re-render the component whenever that
 * piece of state changes.
 *
 * @param selector A function that takes the entire server state and returns the
 *                 piece of state from it that is of interest.
 * @returns The selected piece of server state.
 */
export function useServerState<T>(selector: (state: SyncedState) => T): T {
  const setSelectedStateRef = useRef<((state: T) => void) | null>(null);

  const selectedStateRef = useServerStateRef(selector, (selectedState) => {
    if (!setSelectedStateRef.current) {
      // Should never happen.
      throw new Error();
    }
    return setSelectedStateRef.current(selectedState);
  });

  const [selectedState, setSelectedState] = useState<T>(
    selectedStateRef.current
  );
  setSelectedStateRef.current = setSelectedState;

  return selectedState;
}

export function useServerStateRef<T>(
  selector: (state: SyncedState) => T,
  onChange?: (selectedState: T) => void
): React.MutableRefObject<T> {
  const { subscribe, unsubscribe, stateRef } = useContext(ServerStateContext);

  const selectedStateRef = useRef(selector(stateRef.current));

  const onChangeRef = useLatest(onChange);
  const selectorRef = useLatest(selector);

  useEffect(() => {
    const subscriber = (newState: SyncedState) => {
      const newSelectedState = selectorRef.current(newState);
      if (!Object.is(newSelectedState, selectedStateRef.current)) {
        selectedStateRef.current = newSelectedState;
        onChangeRef.current?.(newSelectedState);
      }
    };
    subscribe(subscriber);
    return () => unsubscribe(subscriber);
  }, [onChangeRef, selectedStateRef, selectorRef, subscribe, unsubscribe]);

  useEffect(() => {
    const newSelectedState = selector(stateRef.current);
    if (!Object.is(newSelectedState, selectedStateRef.current)) {
      selectedStateRef.current = newSelectedState;
      onChangeRef.current?.(newSelectedState);
    }
  }, [onChangeRef, selectedStateRef, selector, stateRef]);

  return selectedStateRef;
}

type OptimisticAction = {
  actions: SyncedStateAction[];
  optimisticKey: string;
  syncToServerThrottle: number;
};

function isOptimisticAction(
  action: SyncedStateAction | OptimisticAction
): action is OptimisticAction {
  return "actions" in action && "optimisticKey" in action;
}

function isAction(
  action: SyncedStateAction | OptimisticAction
): action is SyncedStateAction {
  return !isOptimisticAction(action);
}

/**
 * Returns a dispatch function that can be used to dispatch an action to the
 * server.
 *
 * @returns The dispatch function.
 */
export function useServerDispatch() {
  const { socket, addLocalOptimisticActionAppliers, stateRef } =
    useContext(ServerStateContext);
  const dispatcherKey = useGuranteedMemo(() => rrid(), []);
  const throttledSyncToServer = useRef<
    Map<
      string,
      {
        timeoutId: ReturnType<typeof setTimeout>;
        actions: SyncedStateAction[];
        optimisticUpdateId: OptimisticUpdateID;
      }
    >
  >(new Map());

  useEffect(() => {
    return () => {
      for (const {
        timeoutId,
        // eslint-disable-next-line react-hooks/exhaustive-deps
      } of throttledSyncToServer.current.values()) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return useCallback(
    <A extends SyncedStateAction | OptimisticAction, R extends A | Array<A>>(
      actionOrActionsOrUpdater: R | ((currentState: SyncedState) => R)
    ): R => {
      const actionOrActions =
        typeof actionOrActionsOrUpdater === "function"
          ? actionOrActionsOrUpdater(stateRef.current)
          : actionOrActionsOrUpdater;

      const actions = Array.isArray(actionOrActions)
        ? actionOrActions
        : [actionOrActions as A];

      if (actions.length === 0) {
        return actionOrActions;
      }

      const optimisticUpdateId = rrid<{ id: OptimisticUpdateID }>();
      const throttledOptimisticUpdateIds: Map<string, OptimisticUpdateID> =
        new Map();

      const actionsToSyncToServerImmediately: SyncedStateAction[] = [];

      let hasImmediateOptimisticActions = false;

      for (const action of actions) {
        if (isOptimisticAction(action)) {
          if (action.syncToServerThrottle === 0) {
            actionsToSyncToServerImmediately.push(...action.actions);
            hasImmediateOptimisticActions = true;

            addLocalOptimisticActionAppliers([
              {
                dispatcherKey,
                optimisticUpdateId: optimisticUpdateId,
                actions: action.actions,
                key: action.optimisticKey,
              },
            ]);
          } else {
            if (!throttledOptimisticUpdateIds.has(action.optimisticKey)) {
              throttledOptimisticUpdateIds.set(
                action.optimisticKey,
                rrid<{ id: OptimisticUpdateID }>()
              );
            }
            const throttledOptimisticUpdateId =
              throttledOptimisticUpdateIds.get(action.optimisticKey)!;

            const activeThrottle = throttledSyncToServer.current.get(
              action.optimisticKey
            );

            addLocalOptimisticActionAppliers([
              {
                dispatcherKey,
                optimisticUpdateId: throttledOptimisticUpdateId,
                actions: action.actions,
                key: action.optimisticKey,
              },
            ]);

            if (activeThrottle) {
              activeThrottle.actions = action.actions;
              activeThrottle.optimisticUpdateId = throttledOptimisticUpdateId;
            } else {
              throttledSyncToServer.current.set(action.optimisticKey, {
                actions: action.actions,
                optimisticUpdateId: throttledOptimisticUpdateId,
                timeoutId: setTimeout(() => {
                  const { actions, optimisticUpdateId } =
                    throttledSyncToServer.current.get(action.optimisticKey)!;
                  throttledSyncToServer.current.delete(action.optimisticKey);
                  socket?.emit(SOCKET_DISPATCH_ACTION, {
                    actions: actions,
                    optimisticUpdateId,
                  });
                }, action.syncToServerThrottle),
              });
            }
          }
        } else if (isAction(action)) {
          actionsToSyncToServerImmediately.push(action);
        } else {
          throw new Error("This should never happen.");
        }
      }

      if (actionsToSyncToServerImmediately.length > 0) {
        socket?.emit(SOCKET_DISPATCH_ACTION, {
          actions: actionsToSyncToServerImmediately,
          optimisticUpdateId: hasImmediateOptimisticActions
            ? optimisticUpdateId
            : null,
        });
      }

      return actionOrActions;
    },
    [stateRef, socket, addLocalOptimisticActionAppliers, dispatcherKey]
  );
}

export function useAutoDispatchPlayerIdOnChange(playerId: RRPlayerID | null) {
  const { socket } = useContext(ServerStateContext);

  useEffect(() => {
    socket?.emit(SOCKET_SET_PLAYER_ID, playerId);

    const onReconnect = () => {
      socket?.emit(SOCKET_SET_PLAYER_ID, playerId);
    };

    socket?.io.on("reconnect", onReconnect);
    return () => {
      socket?.io.off("reconnect", onReconnect);
    };
  }, [playerId, socket]);
}
