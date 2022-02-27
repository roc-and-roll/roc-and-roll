import React, { useCallback, useContext, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { Matrix } from "transformation-matrix";
import { SOCKET_BROADCAST_MSG } from "../shared/constants";
import { MakeRRID, RRMapID, RRPoint } from "../shared/state";

// TODO: reuse other as soon as you need a new message type, this is just to
//       make the linter happy as the type is otherwise a constant
type RRMessageType = "reaction" | "snap_view" | "other";

export type RRMessage = RRMessageReaction | RRMessageSnapView | RRMessageOther;

type RRMessageID = MakeRRID<"serverMessage">;

interface RRMessageBase {
  type: RRMessageType;
  id: RRMessageID;
}

export interface RRMessageReaction extends RRMessageBase {
  type: "reaction";
  code: string;
  point: RRPoint;
  mapId: RRMapID;
}

export interface RRMessageSnapView extends RRMessageBase {
  type: "snap_view";
  transform: Matrix;
  mapId: RRMapID;
}

interface RRMessageOther extends RRMessageBase {
  type: "other";
}

type MessageSubscriber = (message: RRMessage) => void;

export const useServerMessages = () => {
  return useContext(ServerMessagesContext);
};

export const ServerMessagesContext = React.createContext<{
  subscribe: (subscriber: MessageSubscriber) => void;
  unsubscribe: (subscriber: MessageSubscriber) => void;
  send: (message: RRMessage) => void;
  socket: Socket | null;
}>({
  subscribe: () => {
    throw new Error("ServerMessagesContext not available.");
  },
  unsubscribe: () => {},
  send: () => {
    throw new Error("ServerMessagesContext not available.");
  },
  socket: null,
});

ServerMessagesContext.displayName = "ServerMessagesContext";

export function ServerMessagesProvider({
  socket,
  children,
}: React.PropsWithChildren<{ socket: Socket }>) {
  const subscribers = useRef<Set<MessageSubscriber>>(new Set());

  const subscribe = useCallback((subscriber: MessageSubscriber) => {
    subscribers.current.add(subscriber);
  }, []);

  const unsubscribe = useCallback((subscriber: MessageSubscriber) => {
    subscribers.current.delete(subscriber);
  }, []);

  const send = (message: RRMessage) => {
    subscribers.current.forEach((subscriber) => subscriber(message));
    socket.emit(SOCKET_BROADCAST_MSG, message);
  };

  useEffect(() => {
    const onMessage = (message: RRMessage) => {
      subscribers.current.forEach((subscriber) => subscriber(message));
    };
    socket.on(SOCKET_BROADCAST_MSG, onMessage);
    return () => {
      socket.off(SOCKET_BROADCAST_MSG, onMessage);
    };
  }, [socket]);

  return (
    <ServerMessagesContext.Provider
      value={{ socket, subscribe, unsubscribe, send }}
    >
      {children}
    </ServerMessagesContext.Provider>
  );
}
