import { createEntityAdapter, createReducer, isAnyOf } from "@reduxjs/toolkit";
import { byId } from "../../client/state";
import {
  privateChatAdd,
  privateChatUpdate,
  privateChatRemove,
  privateChatMessageAdd,
  privateChatMessageUpdate,
} from "../../shared/actions";
import {
  initialSyncedState,
  PrivateChatsSyncedState,
  RRPrivateChat,
  RRPrivateChatMessage,
} from "../../shared/state";

const privateChatsAdapter = createEntityAdapter<RRPrivateChat>();
const privateChatMessagesAdapter = createEntityAdapter<RRPrivateChatMessage>();

export const privateChatsReducer = createReducer(
  initialSyncedState.privateChats,
  (builder) => {
    builder
      .addCase(privateChatAdd, privateChatsAdapter.addOne)
      .addCase(privateChatUpdate, privateChatsAdapter.updateOne)
      .addCase(privateChatRemove, privateChatsAdapter.removeOne)
      .addMatcher(
        isAnyOf(privateChatMessageAdd, privateChatMessageUpdate),
        (state, action) => {
          const { chatId } = action.payload;
          const chat = byId(
            (state as PrivateChatsSyncedState).entities,
            chatId
          );
          if (!chat) {
            console.error("Trying to update chat message of unknown chat.");
            return state;
          }

          if (privateChatMessageAdd.match(action)) {
            privateChatMessagesAdapter.addOne(
              chat.messages,
              action.payload.message
            );
          } else if (privateChatMessageUpdate.match(action)) {
            privateChatMessagesAdapter.updateOne(
              chat.messages,
              action.payload.update
            );
          }

          return state;
        }
      );
  }
);
