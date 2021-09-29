import React, { useCallback, useContext, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { SOCKET_BROADCAST_MSG } from "../shared/constants";
import { MakeRRID, RRMapID, RRPoint } from "../shared/state";
import { useCampaignSocket } from "./campaign";

// TODO: reuse other as soon as you need a new message type, this is just to
//       make the linter happy as the type is otherwise a constant
type RRMessageType = "reaction" | "other";

export type RRMessage = RRMessageReaction | RRMessageOther;

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

interface RRMessageOther extends RRMessageBase {
  type: "other";
}

type MessageSubscriber = (message: RRMessage) => void;

export const useServerMessages = () => {
  return useContext(ServerMessagesContext);
};

const ServerMessagesContext = React.createContext<{
  subscribe: (subscriber: MessageSubscriber) => void;
  unsubscribe: (subscriber: MessageSubscriber) => void;
  send: (message: RRMessage) => void;
  socket: Socket | null;
}>({
  subscribe: () => {},
  unsubscribe: () => {},
  send: () => {},
  socket: null,
});
ServerMessagesContext.displayName = "ServerMessagesContext";

export function ServerMessagesProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  const socket = useCampaignSocket();
  const subscribers = useRef<Set<MessageSubscriber>>(new Set());

  const subscribe = useCallback((subscriber: MessageSubscriber) => {
    subscribers.current.add(subscriber);
  }, []);

  const unsubscribe = useCallback((subscriber: MessageSubscriber) => {
    subscribers.current.delete(subscriber);
  }, []);

  const send = (message: RRMessage) => {
    subscribers.current.forEach((subscriber) => subscriber(message));
    socket?.emit(SOCKET_BROADCAST_MSG, message);
  };

  useEffect(() => {
    const onMessage = (message: RRMessage) => {
      subscribers.current.forEach((subscriber) => subscriber(message));
    };
    socket?.on(SOCKET_BROADCAST_MSG, onMessage);
    return () => {
      socket?.off(SOCKET_BROADCAST_MSG, onMessage);
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
