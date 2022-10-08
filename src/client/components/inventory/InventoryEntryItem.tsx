import {
  faAngleDoubleRight,
  faArrowsAlt,
  faPen,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React, { useState } from "react";
import { Draggable } from "react-beautiful-dnd";
import {
  inventoryEntryMove,
  inventoryEntryRemove,
  inventoryEntryUpdate,
} from "../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import { RRInventoryID, RRInventoryEntryItem } from "../../../shared/state";
import { useConfirm } from "../../dialog-boxes";
import { useMyProps } from "../../myself";
import { useServerDispatch, useServerState } from "../../state";
import { Popover } from "../Popover";
import { Button } from "../ui/Button";
import { SmartTextareaInput } from "../ui/TextInput";
import { InventoryTree } from "../../../shared/inventory-tree";

export const InventoryEntryItem = React.memo(function InventoryItem({
  item,
  nestingLevel,
  itemIndex,
  inventoryId,
  inventoryTree,
  sortable,
  selectable,
}: {
  item: RRInventoryEntryItem;
  nestingLevel: number;
  itemIndex: number;
  inventoryId: RRInventoryID;
  inventoryTree: InventoryTree;
  sortable: boolean;
  selectable: boolean;
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
    dispatch(inventoryEntryRemove(inventoryId, item.id));
  };

  const [editAmount, setEditAmount] = useState(false);

  const [
    moveToOtherInventoryPopoverVisible,
    setMoveToOtherInventoryPopoverVisible,
  ] = useState(false);

  const [editNotes, setEditNotes] = useState(false);

  return (
    <Draggable draggableId={item.id} index={itemIndex}>
      {(provided, snapshot) => (
        <li
          className="group py-0.5 text-xs hover:bg-rr-900 px-3"
          // ref={(node) => dragPreviewRef(dropRef(node))}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            opacity: snapshot.isDragging ? 0 : 1,
            ...provided.draggableProps.style,
          }}
        >
          <span className="flex">
            <span className="font-mono text-rr-400">
              {Array.from({ length: nestingLevel - 1 })
                .fill("│")
                .join(" ")}{" "}
              ├{" "}
              {item.notes.trim().length > 0 && (
                <>
                  <br />
                  {Array.from({ length: nestingLevel })
                    .fill("│")
                    .join(" ")}{" "}
                </>
              )}
            </span>

            <span className="items-center space-x-1 whitespace-nowrap">
              {sortable && <FontAwesomeIcon icon={faArrowsAlt} />}
              {selectable && <input type="checkbox" />}
            </span>
            <span className="pl-1 shrink text-right text-rr-400 min-w-[32px]">
              {editAmount ? (
                <input
                  ref={(node) => node?.focus()}
                  type="number"
                  className="bg-transparent text-current border-none focus:outline-none max-w-[48px]"
                  value={item.amount}
                  onChange={(e) =>
                    dispatch({
                      actions: [
                        inventoryEntryUpdate({
                          inventoryId,
                          update: {
                            id: item.id,
                            changes: { amount: e.target.valueAsNumber },
                          },
                        }),
                      ],
                      optimisticKey: "amount",
                      syncToServerThrottle:
                        DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
                    })
                  }
                  onBlur={() => setEditAmount(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") {
                      setEditAmount(false);
                    }
                  }}
                />
              ) : (
                <span onClick={() => setEditAmount(true)}>
                  {item.amount}&#8239;{/* narrow no-break space */}&times;
                </span>
              )}
            </span>
            <span className="pl-1 flex-1">
              {item.name}
              {editNotes ? (
                <>
                  <SmartTextareaInput
                    ref={(node) => node?.focus()}
                    value={item.notes}
                    className="block w-full p-1 mt-0.5"
                    onChange={(notes) => {
                      dispatch({
                        actions: [
                          inventoryEntryUpdate({
                            inventoryId,
                            update: {
                              id: item.id,
                              changes: { notes },
                            },
                          }),
                        ],
                        optimisticKey: "notes",
                        syncToServerThrottle:
                          DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
                      });
                    }}
                    onBlur={() => setEditNotes(false)}
                    enterKeyHint="done"
                    onKeyDown={(e) => {
                      if (
                        e.key === "Escape" ||
                        (e.key === "Enter" && !e.shiftKey)
                      ) {
                        setEditNotes(false);
                      }
                    }}
                  />
                  <StopEditingHint className="text-right" />
                </>
              ) : (
                item.notes.trim().length > 0 && (
                  <span
                    className="italic line-clamp-1 text-rr-300"
                    onClick={() => setEditNotes(true)}
                  >
                    {item.notes}
                  </span>
                )
              )}
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
            <span className="hidden group-hover:block text-xs pl-1 space-x-2 whitespace-nowrap text-right">
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
                    inventoryTree={inventoryTree}
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
            <Weight item={item} />
          </span>
          {editAmount && <StopEditingHint />}
        </li>
      )}
    </Draggable>
  );
});

function StopEditingHint({ className }: { className?: string }) {
  return (
    <em className={clsx(className, "text-xxs block")}>
      Press <kbd>ESC</kbd> or <kbd>ENTER</kbd> to stop editing.
    </em>
  );
}

function Weight({ item }: { item: RRInventoryEntryItem }) {
  if (item.weight === null) {
    return null;
  }
  const totalWeight = Math.round(item.weight * item.amount);
  return (
    <span
      className={clsx(
        "pl-1 group-hover:hidden",
        totalWeight > 100 ? "text-red-400" : "text-rr-400"
      )}
    >
      {totalWeight}&#8239;
      {/* narrow no-break space */}lb
      {totalWeight !== 1 && "s"}
    </span>
  );
}

function MoveToOtherInventoryPopup({
  item,
  currentInventoryId,
  inventoryTree,
}: {
  item: RRInventoryEntryItem;
  currentInventoryId: RRInventoryID;
  inventoryTree: InventoryTree;
}) {
  const dispatch = useServerDispatch();
  const inventories = useServerState((state) => state.inventories);
  const currentInventory = inventories.entities[currentInventoryId];
  const players = useServerState((state) => state.players);
  const myself = useMyProps("id", "isGM", "inventoryIds");

  if (!currentInventory) {
    return null;
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
          {inventoryTree
            .getAllVisibleInventoryNodesRecursive(myself)
            .filter(({ inventoryId }) => inventoryId !== currentInventoryId)
            .flatMap(({ inventoryId, ownerId }) => {
              const inventory = inventories.entities[inventoryId];
              const player = players.entities[ownerId];
              if (!inventory || !player) {
                return [];
              }
              return { inventory, player };
            })
            .sort((a, b) => {
              if (a.player.id === myself.id && b.player.id !== myself.id) {
                return -1;
              } else if (
                a.player.id !== myself.id &&
                b.player.id === myself.id
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
                      inventoryEntryMove(
                        currentInventoryId,
                        inventory.id,
                        item.id
                      )
                    )
                  }
                >
                  <td className="px-2">{inventory.name}</td>
                  <td className="px-2">{player.name}</td>
                </tr>
              );
            })}
          {inventories.ids.length < 2 && (
            <tr className="list-row">
              <td className="px-2 italic" colSpan={2}>
                You need at least two inventories to move items between them.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
