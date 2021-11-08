import {
  faAngleDoubleRight,
  faArrowsAlt,
  faPen,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import {
  inventoryAdd,
  inventoryItemAdd,
  inventoryItemMove,
  inventoryItemRemove,
  inventoryItemUpdate,
  inventoryRemove,
  inventoryUpdate,
  playerUpdateAddInventoryId,
  playerUpdateRemoveInventoryId,
} from "../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import {
  EMPTY_ENTITY_COLLECTION,
  entries,
  RRInventory,
  RRInventoryID,
  RRInventoryItem,
  RRPlayer,
} from "../../../shared/state";
import { useConfirm, usePrompt } from "../../dialog-boxes";
import { useMyProps } from "../../myself";
import { useServerDispatch, useServerState } from "../../state";
import { CollapsibleWithLocalState } from "../Collapsible";
import { Popover } from "../Popover";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";

function canViewInventory(
  inventory: RRInventory,
  myself: Pick<RRPlayer, "isGM" | "inventoryIds">
): boolean {
  return (
    myself.isGM ||
    inventory.visibility === "everyone" ||
    myself.inventoryIds.includes(inventory.id)
  );
}

export const Inventories = React.memo(function Inventories() {
  const inventories = useServerState((state) => state.inventories);
  const dispatch = useServerDispatch();
  const prompt = usePrompt();
  const myself = useMyProps("id", "isGM", "inventoryIds");

  const newInventory = async () => {
    const name =
      (await prompt("Enter a name for the new inventory"))?.trim() ?? "";
    if (name.length === 0) return;

    const inventoryAddAction = inventoryAdd({
      name,
      visibility: "myself",
      carriedBy: null,
      ownedBy: null,
      items: EMPTY_ENTITY_COLLECTION,
    });

    dispatch([
      inventoryAddAction,
      playerUpdateAddInventoryId({
        id: myself.id,
        inventoryId: inventoryAddAction.payload.id,
      }),
    ]);
  };

  return (
    <>
      <div className="flex mb-2">
        <h2 className="text-2xl">Inventories</h2>
        <span className="flex-1" />
        <Button onClick={newInventory}>New Inventory</Button>
      </div>
      <DragDropContext
        onDragEnd={(result, provided) => {
          // TODO
          console.log("onDragEnd");
          console.log(result, provided);

          if (!result.destination) {
            return;
          }

          const itemId = result.draggableId;
          const fromInventoryId = result.source.droppableId;
          const { droppableId: toInventoryId, index: toIndex } =
            result.destination;
        }}
      >
        {entries(inventories)
          .filter((inventory) => canViewInventory(inventory, myself))
          .map((inventory) => (
            <Inventory
              key={inventory.id}
              inventory={inventory}
              myself={myself}
            />
          ))}
      </DragDropContext>
    </>
  );
});

const Inventory = React.memo(function Inventory({
  inventory,
  myself,
}: {
  inventory: RRInventory;
  myself: Pick<RRPlayer, "id">;
}) {
  const dispatch = useServerDispatch();
  const prompt = usePrompt();
  const confirm = useConfirm();

  const deleteInventory = async () => {
    if (
      !(await confirm(
        `Are you sure you want to delete this inventory and ${inventory.items.ids.length} forever?`
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

  const newItem = async () => {
    const name = (await prompt("Enter a name of the new item"))?.trim() ?? "";
    if (name.length === 0) return;

    dispatch(
      inventoryItemAdd(inventory.id, {
        name,
        amount: 1,
        isInventory: null,
        attunedBy: null,
        notes: "",
        cost: "",
        weight: "",
      })
    );
  };

  const [sortBy, setSortBy] = useState<
    "custom" | "name:asc" | "addedAt:asc" | "addedAt:desc"
  >("custom");

  const sortedItems = useMemo(
    () =>
      entries(inventory.items).sort((a, b) => {
        if (sortBy === "custom") return 0;
        if (sortBy === "name:asc") return a.name.localeCompare(b.name);
        if (sortBy === "addedAt:asc") return a.addedAt - b.addedAt;
        /* if (sortBy === "addedAt:desc") */ return b.addedAt - a.addedAt;
      }),
    [inventory.items, sortBy]
  );

  const carrierName = useServerState((state) =>
    inventory.carriedBy
      ? state.characters.entities[inventory.carriedBy]?.name ?? null
      : null
  );

  return (
    <CollapsibleWithLocalState
      title={`${carrierName ? `${carrierName}'s ` : ""}${inventory.name} (${
        inventory.items.ids.length
      } items)`}
      defaultCollapsed
      localStateKey={`inventory/${inventory.id}`}
    >
      <div className="-mx-3">
        <Droppable droppableId={inventory.id}>
          {(provided, snapshot) => (
            <ul
              className="w-full"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {sortedItems.map((item, itemIndex) => (
                <InventoryItem
                  key={item.id}
                  item={item}
                  itemIndex={itemIndex}
                  inventoryId={inventory.id}
                  sortable={sortBy === "custom"}
                />
              ))}
              {sortedItems.length === 0 && (
                <li className="list-row text-center py-2">
                  <em>This inventory is empty.</em>
                </li>
              )}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </div>
      <div className="text-right mt-1 mb-4">
        <Button unstyled onClick={newItem}>
          <FontAwesomeIcon icon={faPlus} className="mr-1 text-sm" />
          add item
        </Button>
      </div>
      <div>
        <div className="mt-1 mb-3 p-2 border border-rr-500 text-sm">
          <h3 className="pb-1">{inventory.name}: Inventory Settings</h3>
          {inventory.ownedBy}
          {inventory.carriedBy}
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
                { value: "myself", label: "Myself" },
                { value: "everyone", label: "Everyone" },
              ]}
            />
          </label>
          <Button className="red" onClick={deleteInventory}>
            Delete Inventory
          </Button>
        </div>
      </div>
    </CollapsibleWithLocalState>
  );
});

const InventoryItem = React.memo(function InventoryItem({
  item,
  itemIndex,
  inventoryId,
  sortable,
}: {
  item: RRInventoryItem;
  itemIndex: number;
  inventoryId: RRInventoryID;
  sortable: boolean;
}) {
  const dispatch = useServerDispatch();
  const confirm = useConfirm();

  const deleteInventoryItem = async () => {
    if (
      !(await confirm(
        `Are you sure you want to delete this item (${item.name}) forever?`
      ))
    )
      return;
    dispatch(inventoryItemRemove(inventoryId, item.id));
  };

  const [editAmount, setEditAmount] = useState(false);
  const editAmountRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editAmount) {
      editAmountRef.current?.focus();
    }
  }, [editAmount]);

  const [
    moveToOtherInventoryPopoverVisible,
    setMoveToOtherInventoryPopoverVisible,
  ] = useState(false);

  return (
    <Draggable draggableId={item.id} index={itemIndex}>
      {(provided, snapshot) => (
        <li
          className="list-row flex py-0.5"
          // ref={(node) => dragPreviewRef(dropRef(node))}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            opacity: snapshot.isDragging ? 0 : 1,
            ...provided.draggableProps.style,
          }}
        >
          <span className="items-center space-x-1 pl-3 whitespace-nowrap">
            {sortable && <FontAwesomeIcon icon={faArrowsAlt} />}
            <input type="checkbox" />
          </span>
          <span>
            {editAmount ? (
              <input
                type="number"
                ref={editAmountRef}
                className="bg-transparent text-current"
                value={item.amount}
                onChange={(e) =>
                  dispatch({
                    actions: [
                      inventoryItemUpdate({
                        inventoryId,
                        update: {
                          id: item.id,
                          changes: { amount: e.target.valueAsNumber },
                        },
                      }),
                    ],
                    optimisticKey: "amount",
                    syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
                  })
                }
                onBlur={() => setEditAmount(false)}
              />
            ) : (
              <span className="ml-1" onClick={() => setEditAmount(true)}>
                {item.amount}&times;{" "}
              </span>
            )}
          </span>
          <span className="px-1 flex-1">
            {item.name}
            {/*
          <SmartTextInput
            unstyled
            className="flex-1 text-sm w-full bg-transparent text-current"
            value={item.name}
            onChange={(name) =>
              dispatch({
                actions: [
                  inventoryItemUpdate({
                    inventoryId,
                    update: {
                      id: item.id,
                      changes: { name },
                    },
                  }),
                ],
                optimisticKey: "name",
                syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
              })
            }
          />
        */}
          </span>
          <span className="text-xs pl-1 pr-3 space-x-2 whitespace-nowrap text-right">
            <Button
              unstyled
              onClick={() => {
                /* TODO: edit */
              }}
            >
              <FontAwesomeIcon icon={faPen} />
            </Button>
            <Popover
              className="popover-no-padding"
              content={
                <MoveToOtherInventoryPopup
                  item={item}
                  currentInventoryId={inventoryId}
                />
              }
              visible={moveToOtherInventoryPopoverVisible}
              onClickOutside={() =>
                setMoveToOtherInventoryPopoverVisible(false)
              }
              interactive
              placement="right"
            >
              <Button
                unstyled
                onClick={() =>
                  setMoveToOtherInventoryPopoverVisible((visible) => !visible)
                }
              >
                <FontAwesomeIcon icon={faAngleDoubleRight} />
              </Button>
            </Popover>
            <Button
              unstyled
              className="text-red-500"
              onClick={deleteInventoryItem}
            >
              <FontAwesomeIcon icon={faTrash} />
            </Button>
          </span>
        </li>
      )}
    </Draggable>
  );
});

function MoveToOtherInventoryPopup({
  item,
  currentInventoryId,
}: {
  item: RRInventoryItem;
  currentInventoryId: RRInventoryID;
}) {
  const dispatch = useServerDispatch();
  const inventories = useServerState((state) => state.inventories);
  const currentInventory = inventories.entities[currentInventoryId];
  const players = useServerState((state) => state.players);
  const myself = useMyProps("id", "isGM", "inventoryIds");

  if (!currentInventory) {
    return null;
  }

  function findPlayerForInventory(inventoryId: RRInventoryID) {
    return entries(players).find((player) =>
      player.inventoryIds.includes(inventoryId)
    );
  }

  return (
    <>
      <h1 className="px-2 pt-1 text-lg">Move item to</h1>
      <table className="text-base">
        <thead className="text-left">
          <tr>
            <th className="px-2">Inventory</th>
            <th className="px-2">Player</th>
          </tr>
        </thead>
        <tbody>
          {entries(inventories)
            .filter(
              (inventory) =>
                inventory.id !== currentInventoryId &&
                canViewInventory(inventory, myself)
            )
            .map((inventory) => ({
              inventory,
              player: findPlayerForInventory(inventory.id),
            }))
            .sort((a, b) => {
              if (a.player?.id === myself.id && b.player?.id !== myself.id) {
                return -1;
              } else if (
                a.player?.id !== myself.id &&
                b.player?.id === myself.id
              ) {
                return 1;
              }
              return a.inventory.name.localeCompare(b.inventory.name);
            })
            .map(({ inventory, player }) => {
              return (
                <tr
                  key={inventory.id}
                  className="cursor-pointer list-row"
                  onClick={() =>
                    dispatch(
                      inventoryItemMove(
                        currentInventoryId,
                        inventory.id,
                        item.id
                      )
                    )
                  }
                >
                  <td className="px-2">{inventory.name}</td>
                  <td className="px-2">{player?.name}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </>
  );
}
