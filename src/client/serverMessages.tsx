import React, { useCallback, useEffect, useRef } from "react";

type RRMessageType = "reaction";

interface RRMessage {
  type: RRMessageType;
}

type MessageSubscriber = (message: RRMessage) => void;

const ServerMessagesContext = React.createContext<{
  subscribe: (subscriber: MessageSubscriber) => void;
  unsubscribe: (subscriber: MessageSubscriber) => void;
  send: (message: RRMessage) => void;
  socket: SocketIOClient.Socket | null;
}>({
  subscribe: () => {},
  unsubscribe: () => {},
  send: (_) => {},
  socket: null,
});
ServerMessagesContext.displayName = "ServerMessagesContext";

export function ServerMessagesProvider({
  socket,
  children,
}: React.PropsWithChildren<{ socket: SocketIOClient.Socket }>) {
  const subscribers = useRef<Set<MessageSubscriber>>(new Set());

  const subscribe = useCallback((subscriber: MessageSubscriber) => {
    subscribers.current.add(subscriber);
  }, []);

  const unsubscribe = useCallback((subscriber: MessageSubscriber) => {
    subscribers.current.delete(subscriber);
  }, []);

  const send = (message: RRMessage) => {
    socket.emit("MESSAGE", message);
  };

  useEffect(() => {
    const onMessage = () => {};
    socket.on("MESSAGE", onMessage);
    return () => {
      socket.off("MESSAGE", onMessage);
    };
  });

  return (
    <ServerMessagesContext.Provider
      value={{ socket, subscribe, unsubscribe, send }}
    >
      {children}
    </ServerMessagesContext.Provider>
  );
}
