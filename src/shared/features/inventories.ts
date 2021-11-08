import { createEntityAdapter, createReducer, isAnyOf } from "@reduxjs/toolkit";
import {
  inventoryAdd,
  inventoryUpdate,
  inventoryRemove,
  inventoryItemAdd,
  inventoryItemRemove,
  inventoryItemMove,
  inventoryItemUpdate,
} from "../actions";
import { initialSyncedState, RRInventory, RRInventoryItem } from "../state";
import { withDo } from "../util";

const inventoryAdapter = createEntityAdapter<RRInventory>();
const inventoryItemsAdapter = createEntityAdapter<RRInventoryItem>();

export const inventoriesReducer = createReducer(
  initialSyncedState.inventories,
  (builder) => {
    builder
      .addCase(inventoryAdd, inventoryAdapter.addOne)
      .addCase(inventoryUpdate, inventoryAdapter.updateOne)
      .addCase(inventoryRemove, inventoryAdapter.removeOne)
      .addCase(inventoryItemMove, (state, action) => {
        const { fromInventoryId, toInventoryId, itemId, insertAfterItemId } =
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

        const item = fromInventory.items.entities[itemId];
        if (!item) {
          console.error("Trying to move an unknown item.");
          return state;
        }

        inventoryItemsAdapter.removeOne(fromInventory.items, itemId);

        const insertPosition =
          insertAfterItemId === null
            ? // insert at the end
              toInventory.items.ids.length
            : // insert before the item, or at the end, if the item does not
              // exist
              withDo(
                toInventory.items.ids.findIndex(
                  (id) => id === insertAfterItemId
                ),
                (idx) => (idx === -1 ? toInventory.items.ids.length : idx + 1)
              );

        toInventory.items.ids = [
          ...toInventory.items.ids.slice(0, insertPosition),
          itemId,
          ...toInventory.items.ids.slice(insertPosition),
        ];
        toInventory.items.entities[itemId] = item;
      })
      .addMatcher(
        isAnyOf(inventoryItemAdd, inventoryItemUpdate, inventoryItemRemove),
        (state, action) => {
          const { inventoryId } = action.payload;
          const inventory = state.entities[inventoryId];
          if (!inventory) {
            console.error("Trying to update item of unknown inventory.");
            return state;
          }

          if (inventoryItemAdd.match(action)) {
            inventoryItemsAdapter.addOne(inventory.items, action.payload.item);
          } else if (inventoryItemUpdate.match(action)) {
            inventoryItemsAdapter.updateOne(
              inventory.items,
              action.payload.update
            );
          } else if (inventoryItemRemove.match(action)) {
            inventoryItemsAdapter.removeOne(
              inventory.items,
              action.payload.itemId
            );
          }
        }
      );
  }
);
