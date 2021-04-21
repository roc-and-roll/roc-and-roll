import { DeepPartial } from "@reduxjs/toolkit";
import React, {
  useCallback,
  useContext,
  useDebugValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
import {
  EntityCollection,
  initialSyncedState,
  OptimisticUpdateID,
  RRID,
  SyncedState,
  SyncedStateAction,
} from "../shared/state";
import { mergeDeep, rrid } from "../shared/util";
import useRafLoop from "./useRafLoop";

type StatePatch<D> = { patch: DeepPartial<D>; deletedKeys: string[] };

type StateUpdateSubscriber = (
  newState: SyncedState,
  optimisticUpdateIds: OptimisticUpdateID[]
) => void;

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
  stateRef: React.MutableRefObject<SyncedState>;
  socket: SocketIOClient.Socket | null;
}>({
  subscribe: () => {
    // do nothing
  },
  unsubscribe: () => {
    // do nothing
  },
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
  const subscribers = useRef<Set<StateUpdateSubscriber>>(new Set());

  useEffect(() => {
    const onSetState = (msg: {
      state: string;
      finishedOptimisticUpdateIds: OptimisticUpdateID[];
    }) => {
      const state: SyncedState = JSON.parse(msg.state);
      console.log(
        "Server -> Client | SET_STATE | state = ",
        state,
        "finishedOptimisticUpdateIds = ",
        msg.finishedOptimisticUpdateIds
      );

      stateRef.current = state;
      ReactDOM.unstable_batchedUpdates(() => {
        subscribers.current.forEach((subscriber) =>
          subscriber(stateRef.current, msg.finishedOptimisticUpdateIds)
        );
      });
    };

    const onPatchState = (msg: {
      patch: string;
      finishedOptimisticUpdateIds: OptimisticUpdateID[];
    }) => {
      const patch: StatePatch<SyncedState> = JSON.parse(msg.patch);
      console.log(
        "Server -> Client | PATCH_STATE | patch = ",
        patch,
        "finishedOptimisticUpdateIds = ",
        msg.finishedOptimisticUpdateIds
      );

      stateRef.current = applyStatePatch(stateRef.current, patch);
      ReactDOM.unstable_batchedUpdates(() => {
        subscribers.current.forEach((subscriber) =>
          subscriber(stateRef.current, msg.finishedOptimisticUpdateIds)
        );
      });
    };

    socket.on("SET_STATE", onSetState);
    socket.on("PATCH_STATE", onPatchState);

    return () => {
      socket.off("SET_STATE", onSetState);
      socket.off("PATCH_STATE", onPatchState);
    };
  }, [socket]);

  const subscribe = useCallback((subscriber: StateUpdateSubscriber) => {
    subscribers.current.add(subscriber);
  }, []);

  const unsubscribe = useCallback((subscriber: StateUpdateSubscriber) => {
    subscribers.current.delete(subscriber);
  }, []);

  return (
    <ServerStateContext.Provider
      value={{ stateRef, subscribe, unsubscribe, socket }}
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
  console.log("Server -> Client | PATCH_STATE | state = ", patchedState);
  return patchedState;
}

////////////////////////////////////////////////////////////////////////////////
// Hooks
////////////////////////////////////////////////////////////////////////////////

function useForceRerender() {
  const [_, setI] = useState(0);

  return useCallback(() => setI((i) => i + 1), []);
}

/**
 * Get a piece of the server state. Will re-render the component whenever that
 * piece of state changes.
 *
 * @param selector A function that takes the entire server state and returns the
 *                 piece of state from it that is of interest.
 * @returns The selected piece of server state.
 */
export function useServerState<T>(selector: (state: SyncedState) => T): T {
  const rerender = useForceRerender();
  const { subscribe, unsubscribe, stateRef } = useContext(ServerStateContext);

  const selectorRef = useRef<typeof selector | null>(null);
  selectorRef.current = selector;

  const selectedStateRef = useRef<T | null>(null);
  selectedStateRef.current = selectorRef.current(stateRef.current);

  useEffect(() => {
    const subscriber = (newState: SyncedState) => {
      const newSelectedState = selectorRef.current!(newState);
      if (newSelectedState !== selectedStateRef.current) {
        selectedStateRef.current = newSelectedState;
        rerender();
      }
    };
    subscribe(subscriber);
    return () => unsubscribe(subscriber);
  }, [rerender, subscribe, unsubscribe]);

  return selectedStateRef.current;
}

/**
 * Returns a dispatch function that can be used to dispatch an action to the
 * server.
 *
 * @returns The dispatch function.
 */
export function useServerDispatch() {
  const { socket } = useContext(ServerStateContext);

  return useMemo(
    () => <P, T extends string = string, M = never>(
      action: SyncedStateAction<P, T, M>
    ): SyncedStateAction<P, T, M> => {
      socket?.emit("REDUX_ACTION", JSON.stringify(action));
      return action;
    },
    [socket]
  );
}

function useDebounce<A extends unknown[], R extends unknown>(
  callback: (...args: A) => R,
  debounceTime: number
): (...args: A) => void {
  const lastArgs = useRef<A | null>(null);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
    };
  }, []);

  return useCallback(
    (...args: A): void => {
      lastArgs.current = args;
      timeoutId.current ??= setTimeout(() => {
        const args = lastArgs.current!;
        timeoutId.current = null;
        lastArgs.current = null;
        callback(...args);
      }, debounceTime);
    },
    [callback, debounceTime]
  );
}

export function useLatest<V>(value: V) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/* TODO
export function useImmerState<V>(value: V) {
  const [get, set] = useState<any>(value);
  const immerSet = useCallback<typeof set>((value) => {
    if (typeof value === "function") {
      const v = produce(value);
      set(v);
    } else {
      set(value);
    }
  }, []);
  return [get, immerSet];
}
*/

export function useDebouncedServerUpdate<V>(
  serverValue: V,
  actionCreator: (
    p: V
  ) =>
    | undefined
    | SyncedStateAction<unknown, string, never>
    | SyncedStateAction<unknown, string, never>[],
  debounceTime: number,
  lerp?: (start: V, end: V, amount: number) => V
): readonly [V, (newValue: V | ((v: V) => V)) => void] {
  const dispatch = useServerDispatch();
  const { subscribe, unsubscribe } = useContext(ServerStateContext);

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
  const [localValue, _setLocalValue] = useState(serverValue);

  // Display the most relevant data in the React devtools.
  useDebugValue({
    optimisticUpdatePhase: optimisticUpdatePhase.current,
    serverValue,
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
  const serverValueRef = useLatest(serverValue);
  const localValueRef = useLatest(localValue);

  // This effect updates the local value whenever the server value changes, if
  // we do not currently have an active local value.
  // It uses the lerp function, if provided, to smoothly lerp from the old local
  // value to the new server value.
  const [rafStart, rafStop] = useRafLoop();
  useLayoutEffect(() => {
    // console.log("effect/lerp");
    if (optimisticUpdatePhase.current.type === "off") {
      if (!lerpRef.current) {
        _setLocalValue(serverValue);
      } else if (!Object.is(serverValue, localValueRef.current)) {
        // Instead of overwriting the local value with the server value
        // immediately, slowly lerp from the current local value to the server
        // value

        // Copy the current lerp and local value from the ref into local
        // variables, so that they remain stable for the duration of the lerp,
        // instead of using a possibly updated value from the ref.
        const lerp = lerpRef.current;
        const localValue = localValueRef.current;
        rafStart((amount) => {
          // console.log(delta);
          _setLocalValue(
            // Make sure to use the serverValue as is at the end of the
            // animation
            amount === 1 ? serverValue : lerp(localValue, serverValue, amount)
          );
          // Lerp for the same amount of time as the debounceTime.
        }, debounceTime);

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
    // Make sure to only pass serverValue and debounceTime directly, and all
    // other dependencies as refs. Most importantly, pass localValue as just a
    // ref so that this hook is not re-executed when the local value changes.
  }, [serverValue, debounceTime, localValueRef, lerpRef, rafStart, rafStop]);

  // Subscribe to server state changes, but just to track which optimistic
  // updates have been successfully executed. Subscribing will _not_ cause this
  // component to re-render on changes.
  useLayoutEffect(() => {
    // console.log("effect/off");
    const subscriber: StateUpdateSubscriber = (_, optimisticUpdateIds) => {
      // console.log("optimistic id update");
      if (
        optimisticUpdatePhase.current.type === "on-until" &&
        optimisticUpdateIds.includes(optimisticUpdatePhase.current.id)
      ) {
        // The update we were waiting for has been executed on the server. We
        // can now safely switch back to rendering the value from the server.
        //
        // TODO: The setImmediate is a bit of a hack.
        // It is necessary to avoid a race condition:
        // If the server context provider first executes this subscriber, and
        // only later executes the subscriber that updates the serverValue
        // passed into the useDebouncedServerUpdate, the optimisticUpdatePhase
        // would incorrectly have already been set to off, which enbables the
        // lerping on the client that caused the server update. setImmediate
        // makes sure that the serverValue is updated first, which causes the
        // useLayoutEffect above to execute (which does nothing, since the
        // optimisticUpdatePhase is !== "off"), and only then the
        // optimisticUpdatePhase is set to off.
        //
        // We could possibly solve this by modifying the ServerStateProvider
        // to execute callbacks that just listen for finishedOptimisticIds
        // after all callbacks that list for the state.
        setImmediate(() => {
          optimisticUpdatePhase.current = { type: "off" };
          // console.log("set/action finished");
          _setLocalValue(serverValueRef.current);
        });
      }
    };

    subscribe(subscriber);
    return () => unsubscribe(subscriber);
  }, [serverValueRef, subscribe, unsubscribe]);

  // Function that uses the actionCreator argument to create the necessary
  // actions from the latest state. It assigns an __optimisticUpdateId__
  // to each of the actions, and remembers the __optimisticUpdateId__ in the
  // optimisticUpdatePhase ref. I then dispatches the actions to the server.
  const actionDispatch = useCallback(
    (newState: V) => {
      let actionCreatorResult = actionCreatorRef.current(newState);
      if (actionCreatorResult === undefined) {
        return;
      } else if (!Array.isArray(actionCreatorResult)) {
        actionCreatorResult = [actionCreatorResult];
      }
      if (actionCreatorResult.length === 0) {
        return;
      }

      const actions = actionCreatorResult.map((action) => ({
        ...action,
        meta: {
          ...(action.meta ?? {}),
          __optimisticUpdateId__: rrid<{ id: OptimisticUpdateID }>(),
        },
      }));

      optimisticUpdatePhase.current = {
        type: "on-until",
        id: actions[actions.length - 1]!.meta.__optimisticUpdateId__,
      };

      actions.forEach((action) => dispatch(action));
    },
    [dispatch, actionCreatorRef]
  );

  const debouncedActionDispatch = useDebounce(actionDispatch, debounceTime);

  // Simple wrapper around _setLocalValue that sets optimisticUpdatePhase to
  // "on" if the state is changed locally.
  const setLocalValue: typeof _setLocalValue = useCallback(
    (newStateOrUpdater) =>
      _setLocalValue((oldState) => {
        const newState =
          typeof newStateOrUpdater === "function"
            ? (newStateOrUpdater as (v: V) => V)(oldState)
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

export function byId<E extends { id: RRID }>(
  entities: Record<E["id"], E>,
  id: E["id"]
) {
  return entities[id] as E | undefined;
}

export function setById<E extends { id: RRID }>(
  entities: Record<E["id"], E>,
  id: E["id"],
  value: E
) {
  entities[id] = value;
}

export function entries<E extends { id: RRID }>(
  collection: EntityCollection<E>
): E[] {
  return collection.ids.map((id) => byId(collection.entities, id)!);
}
