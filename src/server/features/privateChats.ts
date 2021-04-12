import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  privateChatAdd,
  privateChatUpdate,
  privateChatRemove,
} from "../../shared/actions";
import { initialSyncedState, RRPrivateChat } from "../../shared/state";

const privateChatsAdapter = createEntityAdapter<RRPrivateChat>();

export const privateChatsReducer = createReducer(
  initialSyncedState.privateChats,
  (builder) => {
    builder
      .addCase(privateChatAdd, privateChatsAdapter.addOne)
      .addCase(privateChatUpdate, privateChatsAdapter.updateOne)
      .addCase(privateChatRemove, privateChatsAdapter.removeOne);
  }
);
