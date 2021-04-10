import React, { useContext, useEffect, useState } from "react";
import { MyAction } from "../server/setupReduxStore";
import { MyState, StatePatch } from "../shared/state";
import { mergeDeep } from "../shared/util";

function applyStatePatch(state: MyState, patchData: StatePatch<MyState>) {
  const { patch, deletedKeys } = patchData;
  const patchedState = mergeDeep<MyState>(state, patch);
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

const initialState: MyState = {
  diceRolls: {
    diceRolls: [],
  },
};

const ServerStateContext = React.createContext<{
  state: MyState;
  socket: SocketIOClient.Socket | null;
}>({
  state: initialState,
  socket: null,
});
ServerStateContext.displayName = "ServerStateContext";

export function useServerState<T>(selector: (state: MyState) => T) {
  return selector(useContext(ServerStateContext).state);
}

export function useServerActionDispatch() {
  const socket = useContext(ServerStateContext).socket;

  return (action: MyAction) =>
    socket?.emit("REDUX_ACTION", JSON.stringify(action));
}

export function StateProvider({
  socket,
  ...props
}: React.PropsWithChildren<{ socket: SocketIOClient.Socket }>) {
  const [serverState, setServerState] = useState<MyState>(initialState);

  useEffect(() => {
    socket.on("SET_STATE", (msg: { state: string }) => {
      const state: MyState = JSON.parse(msg.state);
      console.log("Server -> Client | SET_STATE | state = ", state);
      setServerState(state);
    });

    socket.on("PATCH_STATE", (msg: string) => {
      const patch: StatePatch<MyState> = JSON.parse(msg);
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
