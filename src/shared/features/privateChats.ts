import { createEntityAdapter, createReducer, isAnyOf } from "@reduxjs/toolkit";
import {
  privateChatAdd,
  privateChatUpdate,
  privateChatRemove,
  privateChatMessageAdd,
  privateChatMessageUpdate,
} from "../actions";
import {
  initialSyncedState,
  RRPrivateChat,
  RRPrivateChatMessage,
} from "../state";

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
          const chat = state.entities[chatId];
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
