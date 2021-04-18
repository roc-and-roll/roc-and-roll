import {
  RRPrivateChat,
  RRPrivateChatMessage,
  RRPlayerID,
} from "../../../shared/state";

export function wasSentByMe(
  chat: RRPrivateChat,
  message: RRPrivateChatMessage,
  myselfId: RRPlayerID
) {
  const myselfIsA = chat.idA === myselfId;
  const myselfIsB = chat.idB === myselfId;
  if (!myselfIsA && !myselfIsB) {
    throw new Error("This is not my chat!");
  }

  return (
    (myselfIsA && message.direction === "a2b") ||
    (myselfIsB && message.direction === "b2a")
  );
}

export function chatRecipient(chat: RRPrivateChat, myselfId: RRPlayerID) {
  const myselfIsA = chat.idA === myselfId;
  const myselfIsB = chat.idB === myselfId;
  if (!myselfIsA && !myselfIsB) {
    throw new Error("This is not my chat!");
  }

  return myselfIsA ? chat.idB : chat.idA;
}
