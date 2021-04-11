import { DeepPartial } from "@reduxjs/toolkit";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  initialSyncedState,
  SyncedState,
  SyncedStateAction,
} from "../shared/state";
import { mergeDeep } from "../shared/util";

type StatePatch<D> = { patch: DeepPartial<D>; deletedKeys: string[] };

const ServerStateContext = React.createContext<{
  state: SyncedState;
  socket: SocketIOClient.Socket | null;
}>({
  state: initialSyncedState,
  socket: null,
});
ServerStateContext.displayName = "ServerStateContext";

export function ServerStateProvider({
  socket,
  ...props
}: React.PropsWithChildren<{ socket: SocketIOClient.Socket }>) {
  const [serverState, setServerState] = useState<SyncedState>(
    initialSyncedState
  );

  useEffect(() => {
    socket.on("SET_STATE", (msg: { state: string }) => {
      const state: SyncedState = JSON.parse(msg.state);
      console.log("Server -> Client | SET_STATE | state = ", state);
      setServerState(state);
    });

    socket.on("PATCH_STATE", (msg: string) => {
      const patch: StatePatch<SyncedState> = JSON.parse(msg);
      console.log("Server -> Client | PATCH_STATE | patch = ", patch);
      setServerState((state) => applyStatePatch(state, patch));
    });

    return () => {
      socket.off("SET_STATE");
      socket.off("PATCH_STATE");
    };
  }, [socket]);

  return (
    <ServerStateContext.Provider value={{ state: serverState, socket }}>
      {props.children}
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

// Hooks

/**
 * Get a piece of the server state. Will re-render the component whenever that
 * piece of state changes.
 *
 * @param selector A function that takes the entire server state and returns the
 *                 piece of state from it that is of interest.
 * @returns The selected piece of server state.
 */
export function useServerState<T>(selector: (state: SyncedState) => T) {
  // FIXME: Currently, all components using useServerState will re-render on
  // _every_ server state change, regardless of the selector.
  return selector(useContext(ServerStateContext).state);
}

/**
 * Returns a dispatch function that can be used to dispatch an action to the
 * server. This function is not exported (for now), use useServerActionFunction
 * instead.
 *
 * @returns The dispatch function.
 */
function useServerActionDispatch(): (
  action: SyncedStateAction
) => SyncedStateAction {
  const socket = useContext(ServerStateContext).socket;

  return useMemo(
    () => (action: SyncedStateAction) => {
      socket?.emit("REDUX_ACTION", JSON.stringify(action));
      return action;
    },
    [socket]
  );
}

/**
 * This function returns an object that contains all available server actions.
 * Use it like this:
 *
 * ```ts
 * const { rollDice } = useServerActionFunction();
 *
 * // ...
 *
 * <button onClick={() => rollDice(20)}>roll dice</button>
 *
 * ```
 *
 * @returns An object with all available server actions.
 */
export function useServerActionFunction() {
  const dispatch = useServerActionDispatch();

  return useMemo(
    () => ({
      rollDice: (size: number) =>
        dispatch({
          type: "diceRolls/rollDice",
          payload: size,
        }),
    }),
    [dispatch]
  );
}
