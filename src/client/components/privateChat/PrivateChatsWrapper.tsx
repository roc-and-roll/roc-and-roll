import React, { Suspense, useMemo } from "react";
import { useMyself } from "../../myself";
import { byId, entries, useServerState } from "../../state";
import { Collapsible } from "../Collapsible";
import { wasSentByMe } from "./privateChatUtil";

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

  return useMemo(
    () =>
      entries(chats).some((chat) =>
        chat.idA === myself.id || chat.idB === myself.id
          ? entries(chat.messages).some(
              (message) =>
                !message.read && !wasSentByMe(chat, message, myself.id)
            )
          : false
      ),
    [chats, myself.id]
  );
}
