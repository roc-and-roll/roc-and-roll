import React, { useEffect, useState } from "react";
import {
  byId,
  entries,
  RRPrivateChatID,
  RRPrivateChatMessage,
} from "../../../shared/state";
import { useMyself } from "../../myself";
import { useServerDispatch, useServerState } from "../../state";
import "./PrivateChats.scss";
import {
  privateChatAdd,
  privateChatMessageAdd,
  privateChatMessageUpdate,
} from "../../../shared/actions";
import { formatTimestamp } from "../../util";
import { useScrollToBottom } from "../../useScrollToBottom";
import ReactMarkdown from "react-markdown";
import remarkGFM from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useIsTabFocused } from "../../useIsTabFocused";
import { chatRecipient, wasSentByMe } from "./privateChatUtil";
import clsx from "clsx";
import { PrivateChatInput } from "./PrivateChatInput";
import { Button } from "../ui/Button";

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
      const messagesToMarkAsRead = chat
        ? entries(chat.messages).filter(
            (message) => !wasSentByMe(chat, message, myself.id) && !message.read
          )
        : [];
      if (messagesToMarkAsRead) {
        dispatch(
          messagesToMarkAsRead.map((message) =>
            privateChatMessageUpdate(chat.id, {
              id: message.id,
              changes: {
                read: true,
              },
            })
          )
        );
      }
    }
  }, [chat, chat?.messages, dispatch, myself.id, tabFocused]);

  if (!chat || !otherId || !otherPlayer) {
    return <>Loading...</>;
  }

  const send = (message: string) => {
    dispatch(
      privateChatMessageAdd(chat.id, {
        text: message,
        direction: chat.idA === myself.id ? "a2b" : "b2a",
      })
    );
    scrollDownNow();
  };

  return (
    <div className="private-chat">
      <div className="private-chat-header">
        <h3>{otherPlayer.name}</h3>
        <Button onClick={() => close()}>back</Button>
      </div>
      <ul ref={scrollRef} role="list" className="private-chat-messages">
        {entries(chat.messages).map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            mine={wasSentByMe(chat, message, myself.id)}
          />
        ))}
      </ul>
      <PrivateChatInput send={send} otherPlayerId={otherId} />
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
  const playerCollection = useServerState((state) => state.players);
  const otherPlayers = entries(playerCollection).filter(
    (player) => player.id !== myself.id
  );

  const myChats = chatIds
    .map((id) => byId(chats, id)!)
    .filter((chat) => chat.idA === myself.id || chat.idB === myself.id);

  return (
    <ul role="list" className="private-chats-contact-list">
      {otherPlayers.map((player) => {
        const chat = myChats.find(
          (chat) => chat.idB === player.id || chat.idA === player.id
        );
        const numUnread = chat
          ? entries(chat.messages).filter(
              (message) =>
                !wasSentByMe(chat, message, myself.id) && !message.read
            ).length
          : 0;
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
            className={clsx("is-link", {
              "is-unread": numUnread > 0,
            })}
          >
            {player.name}
            {player.isGM && " [GM]"}
            {numUnread > 0 && ` (${numUnread} unread)`}
          </li>
        );
      })}
      {otherPlayers.length === 0 && (
        <li>
          <em>No other players to chat with found.</em>
        </li>
      )}
    </ul>
  );
}
