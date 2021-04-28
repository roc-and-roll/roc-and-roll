import React, { Suspense, useEffect, useRef, useState } from "react";
import { entries, RRPrivateChatMessageID } from "../../../shared/state";
import { useMyself } from "../../myself";
import { useServerState } from "../../state";
import { Collapsible } from "../Collapsible";
import { wasSentByMe } from "./privateChatUtil";
// update acknowledgements if changed
import newMessageSound from "../../sounds/545373__stwime__up3.mp3";
import { useRRSimpleSound } from "../../sound";

// Import PrivateChats laziy to reduce the bundle size.
const PrivateChats = React.lazy(() => import("./PrivateChats"));

export function PrivateChatsWrapper() {
  const hasUnreadMessages = useHasUnreadMessages();

  return (
    <div className="private-chats-wrapper">
      <Collapsible
        title={<>Chats {hasUnreadMessages && <small>unread</small>}</>}
        defaultCollapsed={true}
      >
        <Suspense fallback={"Loading..."}>
          <PrivateChats />
        </Suspense>
      </Collapsible>
    </div>
  );
}

function useHasUnreadMessages() {
  const myself = useMyself();
  const chats = useServerState((state) => state.privateChats);
  const play = useRRSimpleSound(newMessageSound);

  const notifiedMessageIds = useRef(new Set<RRPrivateChatMessageID>());

  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    const newMessages = entries(chats).flatMap((chat) =>
      chat.idA === myself.id || chat.idB === myself.id
        ? entries(chat.messages).filter(
            (message) => !message.read && !wasSentByMe(chat, message, myself.id)
          )
        : []
    );
    setHasUnreadMessages(newMessages.length > 0);

    const unnotifiedMessages = newMessages.filter(
      (each) => !notifiedMessageIds.current.has(each.id)
    );
    if (unnotifiedMessages.length > 0) {
      play();
      unnotifiedMessages.forEach((newMessage) =>
        notifiedMessageIds.current.add(newMessage.id)
      );
    }
  }, [chats, myself.id, play]);

  return hasUnreadMessages;
}
