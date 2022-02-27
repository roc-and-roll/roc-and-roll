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
  MakeRRID,
  OptimisticUpdateID,
  RRPlayerID,
  SyncedState,
  SyncedStateAction,
} from "../shared/state";
import { mapGetAndSetIfMissing, mergeDeep, rrid } from "../shared/util";
import { useLatest } from "./useLatest";
import sjson from "secure-json-parse";
import { measureTime } from "./debug";
import { useGuaranteedMemo } from "./useGuaranteedMemo";

type DeduplicationKey = Opaque<string, "optimisticDeduplicationKey">;

interface OptimisticActionApplierAndCallback {
  applier: OptimisticActionApplier;
  whenDoneOrDiscarded: () => void;
}

/**
 * This class holds a sorted list of optimistic action appliers. Each applier
 * can contain multiple optimistic actions. Appliers are added to the internal
 * list via the add() method and stored in insertion order. Before a new applier
 * is added, its "deduplication key" is calculated using the static
 * getDeduplicationKey() function. If an applier with the same deduplication key
 * is already in the list, it is removed from the list and the new applier is
 * added to the end of the list. This optimization helps to avoid having
 * unnecessary appliers in the list that would be overwritten by a later applier
 * with the same deduplication key.
 *
 * To iterate the list of appliers in insertion order, use the appliers()
 * method.
 *
 * To remove optimistic action appliers that are no longer needed (likely
 * because the optimistic actions have been applied on the server and that state
 * has been synced back to the client), use the deleteByOptimisticUpdateId()
 * method. This will remove all appliers with the given OptimisticUpdateID from
 * the list while leaving other appliers in the list untouched.
 *
 * Note: The list of appliers is internally stored as two Maps for fast lookup.
 */
export class OptimisticActionAppliers {
  private readonly byDeduplicationKey = new Map<
    DeduplicationKey,
    OptimisticActionApplierAndCallback
  >();
  private readonly byOptimisticUpdateId = new Map<
    OptimisticUpdateID,
    Set<OptimisticActionApplierAndCallback>
  >();

  /**
   * Adds a new optimistic action applier to the end of the list. If an applier
   * with the same deduplication key is already in the list, it is removed from
   * the list.
   * The second argument is a callback function that is executed when the
   * applier is removed from the list, either because another applier with the
   * same deduplication key is added to the list or because the applier has been
   * explicitly removed with the deleteByOptimisticUpdateId() method.
   */
  public add(
    applier: OptimisticActionApplier,
    whenDoneOrDiscarded: () => void
  ) {
    const deduplicationKey =
      OptimisticActionAppliers.getDeduplicationKey(applier);

    let cb;
    {
      const oldApplierAndCb = this.byDeduplicationKey.get(deduplicationKey);
      if (oldApplierAndCb) {
        cb = oldApplierAndCb.whenDoneOrDiscarded;
        this.byDeduplicationKey.delete(deduplicationKey);
        const oldApplierAndCbs = this.byOptimisticUpdateId.get(
          oldApplierAndCb.applier.optimisticUpdateId
        );
        if (oldApplierAndCbs) {
          oldApplierAndCbs.delete(oldApplierAndCb);
          if (oldApplierAndCbs.size === 0) {
            this.byOptimisticUpdateId.delete(
              oldApplierAndCb.applier.optimisticUpdateId
            );
          }
        }
      }
    }

    const applierAndCb = { applier, whenDoneOrDiscarded };
    this.byDeduplicationKey.set(deduplicationKey, applierAndCb);

    const currentAppliers = mapGetAndSetIfMissing(
      this.byOptimisticUpdateId,
      applier.optimisticUpdateId,
      () => new Set()
    );
    currentAppliers.add(applierAndCb);

    cb?.();
  }

  /**
   * Deletes all appliers with the given OptimisticUpdateID from the list.
   * Returns true if at least one applier was deleted.
   */
  public deleteByOptimisticUpdateId(id: OptimisticUpdateID): boolean {
    const appliers = this.byOptimisticUpdateId.get(id);
    if (!appliers) {
      return false;
    }

    const cbs = [];

    for (const applier of appliers.values()) {
      const deduplicationKey = OptimisticActionAppliers.getDeduplicationKey(
        applier.applier
      );
      this.byDeduplicationKey.delete(deduplicationKey);
      cbs.push(applier.whenDoneOrDiscarded);
    }

    this.byOptimisticUpdateId.delete(id);

    cbs.forEach((cb) => cb());

    return true;
  }

  /**
   * Deletes the specified applier from the list (checked by identity).
   */
  public deleteApplier(applier: OptimisticActionApplier) {
    const deduplicationKey =
      OptimisticActionAppliers.getDeduplicationKey(applier);

    let cb;

    const applierAndCb = this.byDeduplicationKey.get(deduplicationKey);
    if (applierAndCb?.applier === applier) {
      this.byDeduplicationKey.delete(deduplicationKey);
      cb = applierAndCb.whenDoneOrDiscarded;

      const appliersWithOptimisticUpdateId = this.byOptimisticUpdateId.get(
        applier.optimisticUpdateId
      );
      if (appliersWithOptimisticUpdateId) {
        appliersWithOptimisticUpdateId.delete(applierAndCb);
        if (appliersWithOptimisticUpdateId.size === 0) {
          this.byOptimisticUpdateId.delete(applier.optimisticUpdateId);
        }
      }
    }

    cb?.();
  }

  public appliers(): OptimisticActionApplier[] {
    // We use the fact that Map iterators return elements in insertion order
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/values
    return Array.from(this.byDeduplicationKey.values()).map(
      ({ applier }) => applier
    );
  }

  public static getDeduplicationKey(
    applier: Pick<OptimisticActionApplier, "dispatcherKey" | "key">
  ): DeduplicationKey {
    return `${applier.dispatcherKey}/${applier.key ?? ""}` as DeduplicationKey;
  }
}

export interface StatePatch<D> {
  patch: DeepPartial<D>;
  deletedKeys: string[];
}

type StateUpdateSubscriber = (newState: SyncedState) => void;

type OptimisticUpdateExecutedSubscriber = (
  optimisticUpdateIds: OptimisticUpdateID[]
) => void;

export type OptimisticActionApplierDispatcherKey =
  MakeRRID<"optimistic-dispatcher-key">;

export interface OptimisticActionApplier {
  readonly key?: string;
  readonly optimisticUpdateId: OptimisticUpdateID;
  readonly dispatcherKey: OptimisticActionApplierDispatcherKey;
  readonly actions: ReadonlyArray<SyncedStateAction>;
}

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
export const ServerStateContext = React.createContext<{
  subscribe: (subscriber: StateUpdateSubscriber) => void;
  unsubscribe: (subscriber: StateUpdateSubscriber) => void;
  subscribeToOptimisticUpdateExecuted: (
    subscriber: OptimisticUpdateExecutedSubscriber
  ) => void;
  unsubscribeToOptimisticUpdateExecuted: (
    subscriber: OptimisticUpdateExecutedSubscriber
  ) => void;
  stateRef: React.MutableRefObject<SyncedState>;
  __DEBUG__serverStateRefWithoutOptimisticActionsApplied: React.MutableRefObject<SyncedState>;
  __DEBUG__optimisticActionAppliersRef: React.MutableRefObject<OptimisticActionAppliers>;
  socket: Socket | null;
  addLocalOptimisticActionAppliers: (appliers: OptimisticActionApplier[]) => {
    doneOrDiscarded: Promise<void>;
    discard: () => void;
  };
}>({
  subscribe: () => {},
  unsubscribe: () => {},
  subscribeToOptimisticUpdateExecuted: () => {},
  unsubscribeToOptimisticUpdateExecuted: () => {},
  stateRef: { current: initialSyncedState },
  __DEBUG__serverStateRefWithoutOptimisticActionsApplied: {
    current: initialSyncedState,
  },
  __DEBUG__optimisticActionAppliersRef: {
    current: new OptimisticActionAppliers(),
  },
  socket: null,
  addLocalOptimisticActionAppliers: () => ({
    doneOrDiscarded: Promise.resolve(),
    discard: () => {},
  }),
});

ServerStateContext.displayName = "ServerStateContext";

type ReconnectionAttemptSubscriber = () => void;

export const ServerConnectionContext = React.createContext<{
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

  const ctx = useGuaranteedMemo(
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
      measureTime("STATE_UPDATE_PROPAGATION", () => {
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
      });
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
    (
      finishedOptimisticUpdateIds: OptimisticUpdateID[],
      forceSync: boolean = false
    ) => {
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
      measureTime("SET_STATE", () => {
        const state = (internalServerStateRef.current = sjson.parse(
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
      });
    };

    const onPatchState = (msg: {
      patch: string;
      finishedOptimisticUpdateIds: OptimisticUpdateID[];
    }) => {
      measureTime("PATCH_STATE", () => {
        const patch = sjson.parse(msg.patch) as StatePatch<SyncedState>;
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
      });
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
    (
      appliers: OptimisticActionApplier[]
    ): { doneOrDiscarded: Promise<void>; discard: () => void } => {
      if (appliers.length === 0) {
        return { doneOrDiscarded: Promise.resolve(), discard: () => {} };
      }

      const doneOrDiscardedPromise = Promise.all(
        appliers.map(
          (applier) =>
            new Promise<void>((resolve) => {
              optimisticActionAppliers.current.add(applier, () => resolve());
            })
        )
      );
      updateState([], true);

      return {
        doneOrDiscarded: doneOrDiscardedPromise.then(() => {}),
        discard: () => {
          appliers.forEach((applier) =>
            optimisticActionAppliers.current.deleteApplier(applier)
          );
          updateState([], true);
        },
      };
    },
    [updateState]
  );

  return (
    <ServerStateContext.Provider
      value={{
        stateRef: externalStateRef,
        __DEBUG__serverStateRefWithoutOptimisticActionsApplied:
          internalServerStateRef,
        __DEBUG__optimisticActionAppliersRef: optimisticActionAppliers,
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
export function useServerState<T>(
  selector: (state: SyncedState) => T,
  equalityFn?: (current: T, next: T) => boolean
): T {
  const selectedStateRef = useServerStateRef(
    selector,
    (selectedState) => setSelectedState(selectedState),
    equalityFn
  );

  const [selectedState, setSelectedState] = useState<T>(
    (): T => selectedStateRef.current
  );

  return selectedState;
}

export function useServerStateRef<T>(
  selector: (state: SyncedState) => T,
  onChange?: (selectedState: T) => void,
  equalityFn: (current: T, next: T) => boolean = Object.is
): React.MutableRefObject<T> {
  const { subscribe, unsubscribe, stateRef } = useContext(ServerStateContext);

  const selectedStateRef = useRef(selector(stateRef.current));

  const onChangeRef = useLatest(onChange);
  const selectorRef = useLatest(selector);
  const equalityFnRef = useLatest(equalityFn);

  useEffect(() => {
    const subscriber = (newState: SyncedState) => {
      const newSelectedState = selectorRef.current(newState);
      if (!equalityFnRef.current(selectedStateRef.current, newSelectedState)) {
        selectedStateRef.current = newSelectedState;
        onChangeRef.current?.(newSelectedState);
      }
    };
    subscribe(subscriber);
    return () => unsubscribe(subscriber);
  }, [
    equalityFnRef,
    onChangeRef,
    selectedStateRef,
    selectorRef,
    subscribe,
    unsubscribe,
  ]);

  useEffect(() => {
    const newSelectedState = selector(stateRef.current);
    if (!equalityFn(selectedStateRef.current, newSelectedState)) {
      selectedStateRef.current = newSelectedState;
      onChangeRef.current?.(newSelectedState);
    }
  }, [onChangeRef, selectedStateRef, selector, stateRef, equalityFn]);

  return selectedStateRef;
}

export function useDEBUG__serverState() {
  const {
    __DEBUG__serverStateRefWithoutOptimisticActionsApplied,
    __DEBUG__optimisticActionAppliersRef,
  } = useContext(ServerStateContext);

  return {
    serverStateWithoutOptimisticActionsAppliedRef:
      __DEBUG__serverStateRefWithoutOptimisticActionsApplied,
    optimisticActionAppliersRef: __DEBUG__optimisticActionAppliersRef,
  };
}

interface OptimisticActionsConfig {
  actions: SyncedStateAction[];
  optimisticKey: string;
  syncToServerThrottle: number;
}

function isOptimisticAction(
  action: SyncedStateAction | OptimisticActionsConfig
): action is OptimisticActionsConfig {
  return "actions" in action && "optimisticKey" in action;
}

function isAction(
  action: SyncedStateAction | OptimisticActionsConfig
): action is SyncedStateAction {
  return "payload" in action && !isOptimisticAction(action);
}

interface DispatchActionResult {
  optimisticActionsDoneOrDiscarded: Promise<void>;
  discardPendingOptimisticActions: () => void;
  commitPendingOptimisticActionsNow: () => void;
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
  const socketRef = useLatest(socket);

  const dispatcherKey = useGuaranteedMemo(
    () => rrid<{ id: OptimisticActionApplierDispatcherKey }>(),
    []
  );
  const throttledSyncToServerRef = useRef<
    Map<
      string,
      {
        timeoutId: ReturnType<typeof setTimeout> | null;
        actions: SyncedStateAction[];
        optimisticUpdateId: OptimisticUpdateID;
        discardLocalOptimisticActionAppliers: () => void;
      }
    >
  >(new Map());

  useEffect(() => {
    const socket = socketRef.current;
    const throttledSyncToServer = throttledSyncToServerRef.current;

    return () => {
      for (const {
        timeoutId,
        actions,
        optimisticUpdateId,
      } of throttledSyncToServer.values()) {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);

          socket?.emit(SOCKET_DISPATCH_ACTION, {
            actions: actions,
            optimisticUpdateId,
          });
        }
      }
    };
  }, [socketRef]);

  return useCallback(
    <
      A extends SyncedStateAction | OptimisticActionsConfig,
      R extends A | Array<A>
    >(
      actionOrActionsOrUpdater: R | ((currentState: SyncedState) => R)
    ): DispatchActionResult => {
      const actionOrActions =
        typeof actionOrActionsOrUpdater === "function"
          ? actionOrActionsOrUpdater(stateRef.current)
          : actionOrActionsOrUpdater;

      const allActions: A[] = Array.isArray(actionOrActions)
        ? actionOrActions
        : [actionOrActions as A];

      if (allActions.length === 0) {
        return {
          optimisticActionsDoneOrDiscarded: Promise.resolve(),
          discardPendingOptimisticActions: () => {},
          commitPendingOptimisticActionsNow: () => {},
        };
      }

      let immediateOptimisticUpdateId = null;
      const optimisticUpdateIdCache: Map<string, OptimisticUpdateID> =
        new Map();

      const actionsToSyncToServerImmediately: SyncedStateAction[] = [];

      const optimisticApplierDoneOrDiscardedPromises: Promise<void>[] = [];

      const throttledOptimisticKeys = new Set<string>();

      for (const action of allActions) {
        if (isOptimisticAction(action)) {
          // An array of actions associated with an optimisticKey (used for
          // deduplication) as well as a number that is used to throttle sending
          // these actions to the server.
          const { actions, optimisticKey, syncToServerThrottle } = action;

          if (syncToServerThrottle === 0) {
            // These actions are sent to the server immediately and therefore
            // cannot be discarded or force committed.
            actionsToSyncToServerImmediately.push(...actions);
            immediateOptimisticUpdateId ??= rrid<{ id: OptimisticUpdateID }>();

            optimisticApplierDoneOrDiscardedPromises.push(
              addLocalOptimisticActionAppliers([
                {
                  dispatcherKey,
                  optimisticUpdateId: immediateOptimisticUpdateId,
                  actions,
                  key: optimisticKey,
                },
              ]).doneOrDiscarded
            );
          } else {
            // These actions are sent to the server at some point in the future
            // based on the value of syncToServerThrottle. If the value is
            // Infinity, then the actions are never sent to the server (and
            // need to be sent manually by calling discardPendingActions or
            // commitPendingActionsNow returned by this function).

            throttledOptimisticKeys.add(optimisticKey);

            // Generate a new OptimisticUpdateID to associate with this
            // optimisticKey, if one doesn't already exist. An
            // OptimisticUpdateID may already exist if other actions with the
            // same optimisticKey have already been processed _in the same call
            // to dispatch()_.
            const throttledOptimisticUpdateId = mapGetAndSetIfMissing(
              optimisticUpdateIdCache,
              optimisticKey,
              () => rrid<{ id: OptimisticUpdateID }>()
            );

            // Register the optimistic action applier so that optimistic
            // actions are run locally.
            // TODO: IMHO, ideally, this should only be called once per
            // dispatch call.
            const {
              doneOrDiscarded,
              discard: discardLocalOptimisticActionAppliers,
            } = addLocalOptimisticActionAppliers([
              {
                dispatcherKey,
                optimisticUpdateId: throttledOptimisticUpdateId,
                actions,
                key: optimisticKey,
              },
            ]);
            optimisticApplierDoneOrDiscardedPromises.push(doneOrDiscarded);

            // Check if a previous call to dispatch already dispatched actions
            // with optimisticKey that have not yet been sent to the server and
            // get the corresponding throttle information.
            const activeThrottle =
              throttledSyncToServerRef.current.get(optimisticKey);
            if (activeThrottle) {
              // There are already actions with this optimisticKey that have not
              // yet been sent to the server. Overwrite the previously scheduled
              // actions with the new actions and also update the
              // OptimisticUpdateID.
              activeThrottle.actions = actions;
              activeThrottle.optimisticUpdateId = throttledOptimisticUpdateId;
              activeThrottle.discardLocalOptimisticActionAppliers =
                discardLocalOptimisticActionAppliers;
              if (syncToServerThrottle === Infinity) {
                // It looks like the new optimistic action applier has set the
                // throttle to Infinity. This means that the actions should
                // never be sent to the server. Clear a possibly already running
                // timeout.
                if (activeThrottle.timeoutId !== null) {
                  clearTimeout(activeThrottle.timeoutId);
                }
                activeThrottle.timeoutId = null;
              }
            } else {
              // There are no actions with this optimisticKey that have not yet
              // been sent to the server. Schedule the actions to be sent to the
              // server iff syncToServerThrottle is not Infinity.
              let timeoutId = null;
              if (syncToServerThrottle !== Infinity) {
                timeoutId = setTimeout(() => {
                  const { actions, optimisticUpdateId } =
                    throttledSyncToServerRef.current.get(optimisticKey)!;
                  throttledSyncToServerRef.current.delete(optimisticKey);
                  socketRef.current?.emit(SOCKET_DISPATCH_ACTION, {
                    actions,
                    optimisticUpdateId,
                  });
                }, syncToServerThrottle);
              }

              throttledSyncToServerRef.current.set(optimisticKey, {
                actions,
                optimisticUpdateId: throttledOptimisticUpdateId,
                timeoutId,
                discardLocalOptimisticActionAppliers,
              });
            }
          }
        } else if (isAction(action)) {
          // This is a good old action without any optimistic updating attached.
          // Simply send it to the server and forget about it.
          actionsToSyncToServerImmediately.push(action);
        } else {
          throw new Error("This should never happen.");
        }
      }

      if (actionsToSyncToServerImmediately.length > 0) {
        if (
          process.env.NODE_ENV !== "production" &&
          window.event instanceof InputEvent
        ) {
          console.warn(
            `It looks like you dispatched ${actionsToSyncToServerImmediately.length} actions as part of an input event. Consider using optimistic dispatching with a syncToServerThrottle > 0 instead, so that actions are not sent to the server on every keypress. Actions you dispatched:`,
            actionsToSyncToServerImmediately
          );
        }
        socketRef.current?.emit(SOCKET_DISPATCH_ACTION, {
          actions: actionsToSyncToServerImmediately,
          optimisticUpdateId: immediateOptimisticUpdateId,
        });
      }

      return {
        optimisticActionsDoneOrDiscarded: Promise.all(
          optimisticApplierDoneOrDiscardedPromises
        ).then(() => {}),
        discardPendingOptimisticActions: () => {
          for (const throttledOptimisticKey of throttledOptimisticKeys) {
            const { timeoutId, discardLocalOptimisticActionAppliers } =
              throttledSyncToServerRef.current.get(throttledOptimisticKey)!;
            if (timeoutId !== null) {
              clearTimeout(timeoutId);
            }
            throttledSyncToServerRef.current.delete(throttledOptimisticKey);
            discardLocalOptimisticActionAppliers();
          }
        },
        commitPendingOptimisticActionsNow: () => {
          for (const throttledOptimisticKey of throttledOptimisticKeys) {
            const { actions, optimisticUpdateId, timeoutId } =
              throttledSyncToServerRef.current.get(throttledOptimisticKey)!;
            if (timeoutId !== null) {
              clearTimeout(timeoutId);
            }
            throttledSyncToServerRef.current.delete(throttledOptimisticKey);

            socketRef.current?.emit(SOCKET_DISPATCH_ACTION, {
              actions,
              optimisticUpdateId,
            });
          }
        },
      };
    },
    [stateRef, socketRef, addLocalOptimisticActionAppliers, dispatcherKey]
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
