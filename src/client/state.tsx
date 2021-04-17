import { DeepPartial } from "@reduxjs/toolkit";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
import {
  initialSyncedState,
  SyncedState,
  SyncedStateAction,
} from "../shared/state";
import { mergeDeep } from "../shared/util";

type StatePatch<D> = { patch: DeepPartial<D>; deletedKeys: string[] };

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
  subscribe: (subscriber: (newState: SyncedState) => void) => void;
  unsubscribe: (subscriber: (newState: SyncedState) => void) => void;
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
  const subscribers = useRef<Set<(newState: SyncedState) => void>>(new Set());

  useEffect(() => {
    const onSetState = (msg: { state: string }) => {
      const state: SyncedState = JSON.parse(msg.state);
      console.log("Server -> Client | SET_STATE | state = ", state);

      stateRef.current = state;
      ReactDOM.unstable_batchedUpdates(() => {
        subscribers.current.forEach((subscriber) =>
          subscriber(stateRef.current)
        );
      });
    };

    const onPatchState = (msg: string) => {
      const patch: StatePatch<SyncedState> = JSON.parse(msg);
      console.log("Server -> Client | PATCH_STATE | patch = ", patch);

      stateRef.current = applyStatePatch(stateRef.current, patch);
      ReactDOM.unstable_batchedUpdates(() => {
        subscribers.current.forEach((subscriber) =>
          subscriber(stateRef.current)
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

  const subscribe = useCallback(
    (subscriber: (newState: SyncedState) => void) => {
      subscribers.current.add(subscriber);
    },
    []
  );

  const unsubscribe = useCallback(
    (subscriber: (newState: SyncedState) => void) => {
      subscribers.current.delete(subscriber);
    },
    []
  );

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

/**
 * Get a piece of the server state. Will re-render the component whenever that
 * piece of state changes.
 *
 * @param selector A function that takes the entire server state and returns the
 *                 piece of state from it that is of interest.
 * @returns The selected piece of server state.
 */
export function useServerState<T>(selector: (state: SyncedState) => T) {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const { subscribe, unsubscribe, stateRef } = useContext(ServerStateContext);

  const [state, setState] = useState(selectorRef.current(stateRef.current));

  useEffect(() => {
    const subscriber = (newState: SyncedState) => {
      setState(selectorRef.current(newState));
    };
    subscribe(subscriber);
    return () => unsubscribe(subscriber);
  }, [subscribe, unsubscribe]);

  return state;
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
    () => <A extends SyncedStateAction>(action: A): A => {
      socket?.emit("REDUX_ACTION", JSON.stringify(action));
      return action;
    },
    [socket]
  );
}
