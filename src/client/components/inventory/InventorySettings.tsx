import React from "react";
import {
  inventoryRemove,
  inventoryUpdate,
  playerUpdateRemoveInventoryId,
} from "../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import { RRInventory, RRPlayer } from "../../../shared/state";
import { useConfirm } from "../../dialog-boxes";
import { useServerDispatch } from "../../state";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { SmartTextInput } from "../ui/TextInput";

export type SortBy = "custom" | "name:asc" | "addedAt:asc" | "addedAt:desc";

export function InventorySettings({
  inventory,
  myself,
  sortBy,
  setSortBy,
  closeSettings,
}: {
  inventory: RRInventory;
  myself: Pick<RRPlayer, "id">;
  sortBy: SortBy;
  setSortBy: React.Dispatch<React.SetStateAction<SortBy>>;
  closeSettings: () => void;
}) {
  const dispatch = useServerDispatch();
  const confirm = useConfirm();

  const deleteInventory = async () => {
    if (
      !(await confirm(
        `Are you sure you want to delete this inventory, ${inventory.entries.ids.length} items, and all of its sub inventories forever?`
      ))
    )
      return;
    dispatch([
      inventoryRemove(inventory.id),
      playerUpdateRemoveInventoryId({
        id: myself.id,
        inventoryId: inventory.id,
      }),
    ]);
  };

  return (
    <div>
      <div className="mt-1 mb-3 p-2 border border-rr-500 text-sm">
        <h3 className="pb-1">Settings</h3>
        <label className="pb-1">
          Name
          <SmartTextInput
            value={inventory.name}
            onChange={(name) => {
              dispatch({
                actions: [
                  inventoryUpdate({
                    id: inventory.id,
                    changes: { name },
                  }),
                ],
                optimisticKey: "name",
                syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
              });
            }}
          />
        </label>
        <label className="pb-1">
          Sort order:{" "}
          <Select
            value={sortBy}
            onChange={(sortBy) => setSortBy(sortBy)}
            options={[
              { value: "custom", label: "Custom" },
              { value: "name:asc", label: "Name (A-Z)" },
              { value: "addedAt:asc", label: "Oldest" },
              { value: "addedAt:desc", label: "Newest" },
            ]}
          />
        </label>
        <label className="pb-1">
          Visibility:{" "}
          <Select
            value={inventory.visibility}
            onChange={(visibility) =>
              dispatch({
                actions: [
                  inventoryUpdate({
                    id: inventory.id,
                    changes: { visibility },
                  }),
                ],
                optimisticKey: "visibility",
                syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
              })
            }
            options={[
              { value: "myself", label: "myself" },
              { value: "everyone", label: "everyone" },
              { value: "inherited", label: "inherited from parent group" },
            ]}
          />
        </label>
        <div className="flex">
          <Button className="text-xs" onClick={closeSettings}>
            Close Settings
          </Button>
          <span className="flex-1" />
          <Button className="red text-xs uppercase" onClick={deleteInventory}>
            Delete Inventory
          </Button>
        </div>
      </div>
    </div>
  );
}
