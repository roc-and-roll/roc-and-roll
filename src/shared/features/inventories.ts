import { createEntityAdapter, createReducer, isAnyOf } from "@reduxjs/toolkit";
import {
  inventoryAdd,
  inventoryUpdate,
  inventoryRemove,
  inventoryAddItemEntry,
  inventoryEntryRemove,
  inventoryEntryMove,
  inventoryEntryUpdate,
  inventoryAddInventoryLinkEntry,
} from "../actions";
import { initialSyncedState, RRInventory, RRInventoryEntry } from "../state";
import { withDo } from "../util";

const inventoryAdapter = createEntityAdapter<RRInventory>();
const inventoryItemsAdapter = createEntityAdapter<RRInventoryEntry>();

export const inventoriesReducer = createReducer(
  initialSyncedState.inventories,
  (builder) => {
    builder
      .addCase(inventoryAdd, inventoryAdapter.addOne)
      .addCase(inventoryUpdate, inventoryAdapter.updateOne)
      .addCase(inventoryRemove, inventoryAdapter.removeOne)
      .addCase(inventoryEntryMove, (state, action) => {
        const { fromInventoryId, toInventoryId, itemId, insertBeforeItemId } =
          action.payload;
        const fromInventory = state.entities[fromInventoryId];
        if (!fromInventory) {
          console.error("Trying to move item from an unknown inventory.");
          return state;
        }

        const toInventory = state.entities[toInventoryId];
        if (!toInventory) {
          console.error("Trying to move item to an unknown inventory.");
          return state;
        }

        const item = fromInventory.entries.entities[itemId];
        if (!item) {
          console.error("Trying to move an unknown item.");
          return state;
        }

        const insertPosition =
          insertBeforeItemId === null
            ? // insert at the end
              toInventory.entries.ids.length
            : // insert before the item, or at the end, if the item does not
              // exist
              withDo(
                toInventory.entries.ids.findIndex(
                  (id) => id === insertBeforeItemId
                ),
                (idx) => (idx === -1 ? toInventory.entries.ids.length : idx)
              );

        inventoryItemsAdapter.removeOne(fromInventory.entries, itemId);

        toInventory.entries.ids = [
          ...toInventory.entries.ids.slice(0, insertPosition),
          itemId,
          ...toInventory.entries.ids.slice(insertPosition),
        ];
        toInventory.entries.entities[itemId] = item;
      })
      .addMatcher(
        isAnyOf(
          inventoryAddItemEntry,
          inventoryAddInventoryLinkEntry,
          inventoryEntryUpdate,
          inventoryEntryRemove
        ),
        (state, action) => {
          const { inventoryId } = action.payload;
          const inventory = state.entities[inventoryId];
          if (!inventory) {
            console.error("Trying to update item of unknown inventory.");
            return state;
          }

          if (
            inventoryAddItemEntry.match(action) ||
            inventoryAddInventoryLinkEntry.match(action)
          ) {
            inventoryItemsAdapter.addOne(
              inventory.entries,
              action.payload.entry
            );
          } else if (inventoryEntryUpdate.match(action)) {
            inventoryItemsAdapter.updateOne(
              inventory.entries,
              action.payload.update
            );
          } else if (inventoryEntryRemove.match(action)) {
            inventoryItemsAdapter.removeOne(
              inventory.entries,
              action.payload.itemId
            );
          }
        }
      );
  }
);
