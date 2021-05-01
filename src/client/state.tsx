import type { DeepPartial } from "@reduxjs/toolkit";
import React, {
  useCallback,
  useContext,
  useDebugValue,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
import type { Primitive } from "type-fest";
import { USE_CONCURRENT_MODE } from "../shared/constants";
import {
  initialSyncedState,
  OptimisticUpdateID,
  RRPlayerID,
  SyncedState,
  SyncedStateAction,
} from "../shared/state";
import { mergeDeep, rrid } from "../shared/util";
import { Debouncer, debouncerTime, useDebounce } from "./debounce";
import useRafLoop from "./useRafLoop";

type StatePatch<D> = { patch: DeepPartial<D>; deletedKeys: string[] };

type StateUpdateSubscriber = (newState: SyncedState) => void;

type OptimisticUpdateExecutedSubscriber = (
  optimisticUpdateIds: OptimisticUpdateID[]
) => void;

const DEBUG = false;

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
  socket: SocketIOClient.Socket | null;
}>({
  subscribe: () => {},
  unsubscribe: () => {},
  subscribeToOptimisticUpdateExecuted: () => {},
  unsubscribeToOptimisticUpdateExecuted: () => {},
  stateRef: { current: initialSyncedState },
  socket: null,
});
ServerStateContext.displayName = "ServerStateContext";

export function ServerStateProvider({
  socket,
  children,
}: React.PropsWithChildren<{ socket: SocketIOClient.Socket }>) {
  // We must not useState in this component, because we do not want to cause
  // re-renders of this component and its children when the state changes.
  const stateRef = useRef<SyncedState>(initialSyncedState);
  const finishedOptimisticUpdateIdsRef = useRef<OptimisticUpdateID[]>([]);
  const subscribers = useRef<Set<StateUpdateSubscriber>>(new Set());
  const subscribersToOptimisticUpdatesExecuted = useRef<
    Set<OptimisticUpdateExecutedSubscriber>
  >(new Set());

  const propagationAnimationFrameRef = useRef<number | null>(null);

  const batchUpdatesIfNotConcurrentMode = (cb: () => void) => {
    if (USE_CONCURRENT_MODE) {
      return cb();
    } else {
      ReactDOM.unstable_batchedUpdates(() => {
        cb();
      });
    }
  };

  const propagateStateChange = useCallback(() => {
    const update = () => {
      const state = stateRef.current;
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
    if (process.env.NODE_ENV === "test") {
      update();
    } else {
      propagationAnimationFrameRef.current ??= requestAnimationFrame(() => {
        propagationAnimationFrameRef.current = null;
        update();
      });
    }
  }, []);

  useEffect(() => {
    const onSetState = (msg: {
      state: string;
      finishedOptimisticUpdateIds: OptimisticUpdateID[];
    }) => {
      const state: SyncedState = JSON.parse(msg.state);
      process.env.NODE_ENV === "development" &&
        DEBUG &&
        console.log(
          "Server -> Client | SET_STATE | state = ",
          state,
          "finishedOptimisticUpdateIds = ",
          msg.finishedOptimisticUpdateIds
        );

      stateRef.current = state;
      finishedOptimisticUpdateIdsRef.current = [
        ...finishedOptimisticUpdateIdsRef.current,
        ...msg.finishedOptimisticUpdateIds,
      ];
      propagateStateChange();
    };

    const onPatchState = (msg: {
      patch: string;
      finishedOptimisticUpdateIds: OptimisticUpdateID[];
    }) => {
      const patch: StatePatch<SyncedState> = JSON.parse(msg.patch);
      process.env.NODE_ENV === "development" &&
        DEBUG &&
        console.log(
          "Server -> Client | PATCH_STATE | patch = ",
          patch,
          "finishedOptimisticUpdateIds = ",
          msg.finishedOptimisticUpdateIds
        );

      stateRef.current = applyStatePatch(stateRef.current, patch);
      finishedOptimisticUpdateIdsRef.current = [
        ...finishedOptimisticUpdateIdsRef.current,
        ...msg.finishedOptimisticUpdateIds,
      ];
      propagateStateChange();
    };

    socket.on("SET_STATE", onSetState);
    socket.on("PATCH_STATE", onPatchState);

    return () => {
      socket.off("SET_STATE", onSetState);
      socket.off("PATCH_STATE", onPatchState);
    };
  }, [socket, propagateStateChange]);

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

  return (
    <ServerStateContext.Provider
      value={{
        stateRef,
        subscribe,
        unsubscribe,
        subscribeToOptimisticUpdateExecuted,
        unsubscribeToOptimisticUpdateExecuted,
        socket,
      }}
    >
      {children}
    </ServerStateContext.Provider>
  );
}

function applyStatePatch(
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
  const { subscribe, unsubscribe, stateRef } = useContext(ServerStateContext);

  const selectorRef = useLatest(selector);
  const [selectedState, setSelectedState] = useState(() =>
    selectorRef.current(stateRef.current)
  );

  useEffect(() => {
    const subscriber = (newState: SyncedState) => {
      setSelectedState(selectorRef.current(newState));
    };
    subscribe(subscriber);
    return () => unsubscribe(subscriber);
  }, [selectorRef, subscribe, unsubscribe]);

  return selectedState;
}

/**
 * Returns a dispatch function that can be used to dispatch an action to the
 * server.
 *
 * @returns The dispatch function.
 */
export function useServerDispatch() {
  const { socket } = useContext(ServerStateContext);

  return useCallback(
    <
      P,
      A extends SyncedStateAction<P, T, M> | SyncedStateAction<P, T, M>[],
      T extends string = string,
      M = never
    >(
      actionOrActions: A
    ): A => {
      socket?.emit("REDUX_ACTION", actionOrActions);
      return actionOrActions;
    },
    [socket]
  );
}

export function useAutoDispatchPlayerIdOnChange(playerId: RRPlayerID | null) {
  const { socket } = useContext(ServerStateContext);

  useEffect(() => {
    socket?.emit("SET_PLAYER_ID", playerId);

    const onReconnect = () => {
      socket?.emit("SET_PLAYER_ID", playerId);
    };

    socket?.io.on("reconnect", onReconnect);
    return () => {
      socket?.io.off("reconnect", onReconnect);
    };
  }, [playerId, socket]);
}

export function useLatest<V>(value: V) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

type ActionCreatorResult =
  | undefined
  | SyncedStateAction<unknown, string, never>
  | SyncedStateAction<unknown, string, never>[];

/**
 * Facility for updating a server value in a debounced fashion, while
 * optimistically displaying the updated value locally.
 *
 * If you just want to debounce updates to a server value, use the useDebounced,
 * useAggregatedDebounce, or useAggregatedDoubleDebounce hooks instead.
 *
 * Be aware that "debouncing server updates" means that other clients only see
 * a new value every so often. This can be a problem when trying to sync a
 * continuous action, like the movement of a token on the map.
 * Use useOptimisticDebouncedLerpedServerUpdate for continuous movements
 * instead.
 *
 * @param serverValue
 * @param actionCreator
 * @param debounce
 * @returns
 */
export function useOptimisticDebouncedServerUpdate<V>(
  serverValue: V,
  actionCreator: (p: V) => ActionCreatorResult,
  debounce: Debouncer
): readonly [V, React.Dispatch<React.SetStateAction<V>>] {
  return _useDebouncedServerUpdateInternal(
    serverValue,
    actionCreator,
    debounce,
    undefined
  );
}

export function useOptimisticDebouncedLerpedServerUpdate<V>(
  selector: (s: SyncedState) => V,
  actionCreator: (p: V) => ActionCreatorResult,
  debounce: Debouncer,
  lerp: (start: V, end: V, amount: number) => V
): readonly [V, React.Dispatch<React.SetStateAction<V>>] {
  return _useDebouncedServerUpdateInternal(
    selector,
    actionCreator,
    debounce,
    lerp
  );
}

function _useDebouncedServerUpdateInternal<V>(
  serverValueOrSelector: V,
  actionCreator: (p: V) => ActionCreatorResult,
  debounce: Debouncer,
  lerp: undefined
): readonly [V, React.Dispatch<React.SetStateAction<V>>];

function _useDebouncedServerUpdateInternal<V>(
  serverValueOrSelector: (s: SyncedState) => V,
  actionCreator: (p: V) => ActionCreatorResult,
  debounce: Debouncer,
  lerp: (start: V, end: V, amount: number) => V
): readonly [V, React.Dispatch<React.SetStateAction<V>>];

/**
 * Internal implementation shared by the useOptimisticDebouncedServerUpdate and
 * useOptimisticDebouncedLerpedServerUpdate hooks. We MUST NOT expose this
 * internal implementation, because we need to gurantee that whether or not
 * lerping is enabled remains constant during the lifetime of this hook, which
 * allows us to "conditionally" use other hooks based on that.
 *
 * @param serverValueOrSelector
 * @param actionCreator
 * @param debounce
 * @param lerp
 * @returns
 */
function _useDebouncedServerUpdateInternal<
  // V is allowed to be basically everything, except for functions. Feel free
  // to extend V further.
  V extends Primitive | Record<string | number, unknown>
>(
  serverValueOrSelector: V | ((s: SyncedState) => V),
  actionCreator: (p: V) => ActionCreatorResult,
  debounce: Debouncer,
  lerp: undefined | ((start: V, end: V, amount: number) => V)
): readonly [V, React.Dispatch<React.SetStateAction<V>>] {
  const dispatch = useServerDispatch();
  const {
    subscribe,
    unsubscribe,
    subscribeToOptimisticUpdateExecuted,
    unsubscribeToOptimisticUpdateExecuted,
    stateRef,
  } = useContext(ServerStateContext);

  const optimisticUpdatePhase = useRef<
    // no optimistic local value active
    // -> render the value as is from the server
    | { type: "off" }
    // optimistic local value active, but not yet sent to the server
    // -> render the local value
    | { type: "on" }
    // optimistic local value active, and the result was sent to the server.
    // If the server notifies us that the action corresponding to the optimistic
    // update id has executed, we must switch back to using the value from the
    // server.
    | { type: "on-until"; id: OptimisticUpdateID }
  >({ type: "off" });

  // The localValue is the value that is returned from this hook. It normally
  // follows the server value, except when there are changes to the local value
  // that have not yet been sent and received from the server.
  const [localValue, _setLocalValue] = useState(
    typeof serverValueOrSelector === "function"
      ? () => serverValueOrSelector(stateRef.current)
      : serverValueOrSelector
  );

  // Display the most relevant data in React devtools.
  useDebugValue({
    optimisticUpdatePhase: optimisticUpdatePhase.current,
    serverValueOrSelector,
    localValue,
  });

  // Keep track of these values in refs to be able to use them inside callbacks
  // without having to pass them as dependencies.
  //
  // Note: ESlint is unable to determine that these are just wrappers around
  // useRef, which is why we have to pass them as dependencies to make ESlint
  // happy. This is not a problem, however, because the identity of the ref
  // remains stable.
  const actionCreatorRef = useLatest(actionCreator);
  const lerpRef = useLatest(lerp);
  const serverValueOrSelectorRef = useLatest(serverValueOrSelector);
  const localValueRef = useLatest(localValue);

  // This condition is fine, even though we use hooks based on it, since the
  // condition is guranteed to never change for the lifetime of this hook.
  if (typeof serverValueOrSelector === "function") {
    // This effect updates the local value whenever the server value changes, if
    // we do not currently have an active local value. It uses the lerp
    // function to smoothly lerp from the old local value to the new server
    // value.

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [rafStart, rafStop] = useRafLoop();

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const subscriber = (state: SyncedState) => {
        if (optimisticUpdatePhase.current.type === "off") {
          const selector = serverValueOrSelectorRef.current;
          if (typeof selector !== "function") {
            throw new Error("should never happen");
          }
          const serverValue = selector(state);

          if (!Object.is(serverValue, localValueRef.current)) {
            // Instead of overwriting the local value with the server value
            // immediately, slowly lerp from the current local value to the
            // server value

            // Copy the current lerp and local value from the ref into local
            // variables, so that they remain stable for the duration of the
            // lerp, instead of using a possibly updated value from the ref.
            const lerp = lerpRef.current;
            if (!lerp) {
              throw new Error("should never happen");
            }
            const localValue = localValueRef.current;
            rafStart((amount) => {
              // console.log(delta);
              _setLocalValue(
                // Make sure to use the serverValue as is at the end of the
                // animation
                amount === 1
                  ? serverValue
                  : lerp(localValue, serverValue, amount)
              );
              // Lerp for the same amount of time as the debounceTime.
            }, debouncerTime(debounce));

            return () => {
              // If the server value updates while we were currently lerping,
              // aboirt the current lerp and set the local value to the end position
              // of the interrupted lerp.
              if (rafStop()) {
                _setLocalValue(serverValue);
              }
            };
          }
        }
      };

      subscribe(subscriber);
      return () => unsubscribe(subscriber);
    }, [
      debounce,
      lerpRef,
      localValueRef,
      rafStart,
      rafStop,
      serverValueOrSelectorRef,
      subscribe,
      unsubscribe,
    ]);
  } else {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (optimisticUpdatePhase.current.type === "off") {
        _setLocalValue(serverValueOrSelector);
      }
    }, [serverValueOrSelector]);
  }

  // Subscribe to server state changes, but just to track which optimistic
  // updates have been successfully executed. Subscribing will _not_ cause this
  // component to re-render on changes.
  useEffect(() => {
    // console.log("effect/off");
    const subscriber: OptimisticUpdateExecutedSubscriber = (
      optimisticUpdateIds
    ) => {
      // console.log("optimistic id update");
      if (
        optimisticUpdatePhase.current.type === "on-until" &&
        optimisticUpdateIds.includes(optimisticUpdatePhase.current.id)
      ) {
        // The update we were waiting for has been executed on the server. We
        // can now safely switch back to rendering the value from the server.
        optimisticUpdatePhase.current = { type: "off" };
        // console.log("set/action finished");
        _setLocalValue(
          typeof serverValueOrSelectorRef.current === "function"
            ? serverValueOrSelectorRef.current(stateRef.current)
            : serverValueOrSelectorRef.current
        );
      }
    };

    subscribeToOptimisticUpdateExecuted(subscriber);
    return () => unsubscribeToOptimisticUpdateExecuted(subscriber);
  }, [
    serverValueOrSelectorRef,
    stateRef,
    subscribeToOptimisticUpdateExecuted,
    unsubscribeToOptimisticUpdateExecuted,
  ]);

  // Function that uses the actionCreator argument to create the necessary
  // actions from the latest state. It assigns an __optimisticUpdateId__
  // to the last action, and remembers the __optimisticUpdateId__ in the
  // optimisticUpdatePhase ref. It then dispatches the actions to the server.
  const actionDispatch = useCallback(
    (newState: V) => {
      let actionCreatorResult = actionCreatorRef.current(newState);
      if (actionCreatorResult === undefined) {
        return;
      } else if (!Array.isArray(actionCreatorResult)) {
        actionCreatorResult = [actionCreatorResult];
      }

      const actions = actionCreatorResult;
      if (actions.length === 0) {
        return;
      }

      const optimisticUpdateId = rrid<{ id: OptimisticUpdateID }>();

      const lastAction = actions[actions.length - 1]!;
      actions[actions.length - 1] = {
        ...lastAction,
        meta: {
          ...(lastAction.meta ?? {}),
          __optimisticUpdateId__: optimisticUpdateId,
        },
      };

      optimisticUpdatePhase.current = {
        type: "on-until",
        id: optimisticUpdateId,
      };

      dispatch(actions);
    },
    [dispatch, actionCreatorRef]
  );

  const debouncedActionDispatch = useDebounce(actionDispatch, debounce, true);

  // Simple wrapper around _setLocalValue that sets optimisticUpdatePhase to
  // "on" if the state is changed locally.
  const setLocalValue: typeof _setLocalValue = useCallback(
    (newStateOrUpdater) =>
      _setLocalValue((oldState) => {
        const newState =
          typeof newStateOrUpdater === "function"
            ? newStateOrUpdater(oldState)
            : newStateOrUpdater;

        if (!Object.is(newState, oldState)) {
          // Only enable optimistic updates if the newState is not equal to the
          // old state.
          optimisticUpdatePhase.current = { type: "on" };
        }

        return newState;
      }),
    []
  );

  // Whenever the local value changes, and we are currently not displaying the
  // value from the server, dispatch the changes to the server in a debounced
  // fashion.
  useEffect(() => {
    if (optimisticUpdatePhase.current.type !== "off") {
      debouncedActionDispatch(localValue);
    }
  }, [localValue, debouncedActionDispatch]);

  // console.log(localValue);
  return [localValue, setLocalValue] as const;
}
