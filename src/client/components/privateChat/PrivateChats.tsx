import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RRPrivateChatID, RRPrivateChatMessage } from "../../../shared/state";
import { useMyself } from "../../myself";
import { byId, useServerDispatch, useServerState } from "../../state";
import "./PrivateChats.scss";
import { privateChatAdd, privateChatUpdate } from "../../../shared/actions";
import { rrid, timestamp } from "../../../shared/util";
import { formatTimestamp } from "../../util";
import { useScrollToBottom } from "../../useScrollToBottom";
import ReactMarkdown from "react-markdown";
import remarkGFM from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useIsTabFocused } from "../../useIsTabFocused";
import { chatRecipient, wasSentByMe } from "./privateChatUtil";

export default function PrivateChats() {
  const [selectedChatId, setSelectedChatId] = useState<RRPrivateChatID | null>(
    null
  );

  return selectedChatId ? (
    <Chat id={selectedChatId} close={() => setSelectedChatId(null)} />
  ) : (
    <ContactList setSelectedChatId={setSelectedChatId} />
  );
}

function Chat({ id, close }: { id: RRPrivateChatID; close: () => void }) {
  const dispatch = useServerDispatch();
  const chat = useServerState((state) => byId(state.privateChats.entities, id));
  const myself = useMyself();
  const otherId = chat ? chatRecipient(chat, myself.id) : null;
  const otherPlayer = useServerState((state) =>
    otherId ? byId(state.players.entities, otherId) : null
  );
  const [scrollRef, scrollDownNow] = useScrollToBottom<HTMLUListElement>([
    !!chat,
    !!otherId,
    !!otherPlayer,
  ]);
  const tabFocused = useIsTabFocused();

  useEffect(() => {
    if (chat && tabFocused) {
      const hasMessagesToMarkAsRead = chat?.messages.some(
        (message) => !wasSentByMe(chat, message, myself.id) && !message.read
      );
      if (hasMessagesToMarkAsRead) {
        dispatch(
          privateChatUpdate({
            id: chat.id,
            changes: {
              messages: [
                // TODO: This is a race condition
                ...chat.messages.map((message) =>
                  !wasSentByMe(chat, message, myself.id) && !message.read
                    ? { ...message, read: true }
                    : message
                ),
              ],
            },
          })
        );
      }
    }
  }, [chat, chat?.messages, dispatch, myself.id, tabFocused]);

  if (!chat || !otherId || !otherPlayer) {
    return <>Loading...</>;
  }

  const send = (message: string) => {
    dispatch(
      privateChatUpdate({
        id: chat.id,
        changes: {
          messages: [
            // TODO: This is a race condition
            ...chat.messages,
            {
              id: rrid<RRPrivateChatMessage>(),
              read: false,
              text: message,
              timestamp: timestamp(),
              direction: chat.idA === myself.id ? "a2b" : "b2a",
            },
          ],
        },
      })
    );
    scrollDownNow();
  };

  return (
    <div className="private-chat">
      <div className="private-chat-header">
        <h3>{otherPlayer.name}</h3>
        <button onClick={() => close()}>back</button>
      </div>
      <ul ref={scrollRef} role="list" className="private-chat-messages">
        {chat.messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            mine={wasSentByMe(chat, message, myself.id)}
          />
        ))}
      </ul>
      <ChatInput send={send} />
    </div>
  );
}

function ChatMessage({
  message,
  mine,
}: {
  message: RRPrivateChatMessage;
  mine: boolean;
}) {
  return (
    <li className={mine ? "sent" : "received"}>
      <ReactMarkdown
        className="markdown"
        remarkPlugins={[remarkGFM, remarkBreaks]}
        linkTarget="_blank"
      >
        {message.text}
      </ReactMarkdown>
      <small>
        {formatTimestamp(message.timestamp)}
        {mine && " " + (message.read ? "✓" : "UNREAD")}
      </small>
    </li>
  );
}

function ChatInput(props: { send: (message: string) => void }) {
  const [text, setText] = useState("");

  // auto resize
  const textarea = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (textarea.current) {
      textarea.current.style.height = "auto";
      textarea.current.style.height =
        (textarea.current.scrollHeight + 4).toString() + "px";
    }
  }, [text]);

  // Focus the text input on load
  useEffect(() => {
    textarea.current?.focus();
  }, []);

  const send = () => {
    const message = text.trim();
    if (message.length > 0) {
      props.send(message);
      setText("");
      textarea.current?.focus();
    }
  };

  return (
    <div className="private-chat-input">
      <textarea
        ref={textarea}
        rows={1}
        placeholder="Type message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={(e) => {
          if (!e.shiftKey && e.key === "Enter") {
            e.preventDefault();
            send();
          }
        }}
      />
      <button onClick={send} disabled={text.trim().length === 0}>
        send
      </button>
    </div>
  );
}

function ContactList({
  setSelectedChatId,
}: {
  setSelectedChatId: (id: RRPrivateChatID) => void;
}) {
  const dispatch = useServerDispatch();
  const myself = useMyself();
  const { ids: chatIds, entities: chats } = useServerState(
    (state) => state.privateChats
  );
  const { ids: playerIds, entities: playerMap } = useServerState(
    (state) => state.players
  );

  const players = playerIds.map((id) => byId(playerMap, id)!);

  const myChats = chatIds
    .map((id) => byId(chats, id)!)
    .filter((chat) => chat.idA === myself.id || chat.idB === myself.id);

  return (
    <ul role="list" className="private-chats-contact-list">
      {players
        .filter((player) => player.id !== myself.id)
        .map((player) => {
          const chat = myChats.find(
            (chat) => chat.idB === player.id || chat.idA === player.id
          );
          const numUnread =
            chat?.messages.filter(
              (message) =>
                !wasSentByMe(chat, message, myself.id) && !message.read
            ).length ?? 0;
          return (
            <li
              key={player.id}
              onClick={() => {
                if (chat) {
                  setSelectedChatId(chat.id);
                } else {
                  const id = dispatch(privateChatAdd(myself.id, player.id))
                    .payload.id;
                  setSelectedChatId(id);
                }
              }}
              className={numUnread > 0 ? "is-unread" : undefined}
            >
              {player.name}
              {player.isGM && " [GM]"}
              {numUnread > 0 && ` (${numUnread} unread)`}
            </li>
          );
        })}
    </ul>
  );
}
