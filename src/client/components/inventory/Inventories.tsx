import {
  faBug,
  faCog,
  faLock,
  faPlus,
  faShareAlt,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useMemo, useState } from "react";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { InventorySettings, SortBy } from "./InventorySettings";
import {
  inventoryAdd,
  inventoryAddInventoryLinkEntry,
  inventoryAddItemEntry,
  playerUpdateAddInventoryId,
} from "../../../shared/actions";
import {
  EMPTY_ENTITY_COLLECTION,
  entries,
  RRInventory,
  RRPlayer,
} from "../../../shared/state";
import { usePrompt } from "../../dialog-boxes";
import { useMyProps } from "../../myself";
import {
  useServerDispatch,
  useServerState,
  useServerStateRef,
} from "../../state";
import { Button } from "../ui/Button";
import { RRTooltip } from "../RRTooltip";
import { RRFontAwesomeIcon } from "../RRFontAwesomeIcon";
import { InventoryEntryItem } from "./InventoryEntryItem";
import { InventoryEntryInventoryLink } from "./InventoryEntryInventoryLink";
import useLocalState from "../../useLocalState";
import { CollapseButton } from "../CollapseButton";
import {
  buildInventoryTree,
  InventoryTree,
  InventoryTreeNode,
} from "../../../shared/inventory-tree";
import { withDo } from "../../../shared/util";

export const Inventories = React.memo(function Inventories() {
  const inventories = useServerState((state) => state.inventories);
  const playerInventories = useServerState(
    (state) =>
      entries(state.players).map((player) => ({
        playerId: player.id,
        inventoryIds: player.inventoryIds,
      })),
    (a, b) =>
      a.length === b.length &&
      a.every(
        (a, i) =>
          a.playerId === b[i]!.playerId && a.inventoryIds === b[i]!.inventoryIds
      )
  );
  const dispatch = useServerDispatch();
  const prompt = usePrompt();
  const myself = useMyProps("id", "isGM", "inventoryIds");

  const createPlayerInventory = async () => {
    const name =
      (await prompt("What is the name of this inventory?"))?.trim() ?? "";
    if (name.length === 0) {
      return;
    }

    const inventoryAddAction = inventoryAdd({
      name,
      visibility: "inherited",
      entries: EMPTY_ENTITY_COLLECTION,
    });

    dispatch([
      inventoryAddAction,
      playerUpdateAddInventoryId({
        id: myself.id,
        inventoryId: inventoryAddAction.payload.id,
      }),
    ]);
  };

  const inventoryTree = useMemo(
    () => buildInventoryTree(playerInventories, inventories),
    [playerInventories, inventories]
  );

  return (
    <>
      <div className="flex mb-2">
        <h2 className="text-2xl">Inventories</h2>
        <span className="flex-1" />
        <Button onClick={createPlayerInventory}>
          <FontAwesomeIcon icon={faPlus} className="mr-1" />
          Create Inventory
        </Button>
      </div>
      <DragDropContext
        onDragEnd={(result, provided) => {
          // TODO: Implement drag and drop.
          console.log("onDragEnd");
          console.log(result, provided);

          // if (!result.destination) {
          //   return;
          // }

          // const itemId = result.draggableId;
          // const fromInventoryId = result.source.droppableId;
          // const { droppableId: toInventoryId, index: toIndex } =
          //   result.destination;
        }}
      >
        <div className="-mx-3">
          {inventoryTree
            .getVisibleRootInventoriesFor(myself)
            .map((treeNode) => {
              const inventory = inventories.entities[treeNode.inventoryId];
              return (
                inventory && (
                  <Inventory
                    key={inventory.id}
                    inventory={inventory}
                    inventoryTree={inventoryTree}
                    inventoryTreeNode={treeNode}
                    nestingLevel={1}
                    myself={myself}
                  />
                )
              );
            })}
        </div>
      </DragDropContext>
    </>
  );
});

export const Inventory = React.memo(function Inventory({
  inventory,
  inventoryTree,
  inventoryTreeNode,
  nestingLevel,
  myself,
}: {
  inventory: RRInventory;
  inventoryTree: InventoryTree;
  inventoryTreeNode: InventoryTreeNode;
  nestingLevel: number;
  myself: Pick<RRPlayer, "id" | "inventoryIds" | "isGM">;
}) {
  const [sortBy, setSortBy] = useState<SortBy>("custom");

  const inventoriesRef = useServerStateRef((state) => state.inventories);

  const sortedItems = useMemo(
    () =>
      entries(inventory.entries).sort((a, b) => {
        if (sortBy === "custom") return 0;
        if (sortBy === "name:asc") {
          const aName =
            a.type === "item"
              ? a.name
              : inventoriesRef.current.entities[a.inventoryId]?.name ?? "";
          const bName =
            b.type === "item"
              ? b.name
              : inventoriesRef.current.entities[b.inventoryId]?.name ?? "";
          return aName.localeCompare(bName);
        }
        if (sortBy === "addedAt:asc") return a.addedAt - b.addedAt;
        /* if (sortBy === "addedAt:desc") */ return b.addedAt - a.addedAt;
      }),
    [inventory.entries, inventoriesRef, sortBy]
  );

  const [settingsOpen, setSettingsOpen] = useState(false);

  if (myself.id !== inventoryTreeNode.ownerId && !myself.isGM && settingsOpen) {
    setSettingsOpen(false);
  }

  const [collapsed, setCollapsed] = useLocalState(
    `inventory/collapsed/${inventoryTreeNode.getPath().join("/")}`,
    false
  );

  return (
    <>
      <span className="flex items-center space-x-2 mx-3 text-xs">
        <span className="flex-1">
          <span className="font-mono text-rr-400">
            {Array.from({ length: nestingLevel - 2 })
              .fill("│")
              .join(" ")}{" "}
            {nestingLevel > 0 && "├─"}
            {nestingLevel > 1 && "┬"}
          </span>
          <CollapseButton
            className="mx-0.5"
            size={20}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
          />
          <span className="font-bold">{inventory.name}</span> (
          {inventory.entries.ids.length}{" "}
          {inventory.entries.ids.length === 1 ? "entry" : "entries"})
        </span>
        <InventoryVisibilityIcon
          inventoryTreeNode={inventoryTreeNode}
          myself={myself}
        />
        {(myself.id === inventoryTreeNode.ownerId || myself.isGM) && (
          <RRTooltip placement="bottom" content="Settings">
            <Button
              unstyled
              onClick={() => setSettingsOpen((settingsOpen) => !settingsOpen)}
            >
              <RRFontAwesomeIcon className="cursor-pointer" icon={faCog} />
            </Button>
          </RRTooltip>
        )}
      </span>
      {settingsOpen && (
        <div className="mx-3">
          <InventorySettings
            inventory={inventory}
            myself={myself}
            sortBy={sortBy}
            setSortBy={setSortBy}
            closeSettings={() => setSettingsOpen(false)}
          />
        </div>
      )}
      {!collapsed && (
        <>
          <div className="px-3 text-xs flex">
            <span className="font-mono text-rr-400">
              {Array.from({ length: nestingLevel }).fill("│").join(" ")}{" "}
            </span>
            <span className="flex-1 text-right">
              <InventoryActions inventory={inventory} />
            </span>
          </div>
          <div>
            <Droppable droppableId={inventory.id}>
              {(provided, snapshot) => (
                <ul
                  className="w-full"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {sortedItems.map((entry, itemIndex) =>
                    entry.type === "item" ? (
                      <InventoryEntryItem
                        key={entry.id}
                        nestingLevel={nestingLevel}
                        item={entry}
                        itemIndex={itemIndex}
                        inventoryId={inventory.id}
                        inventoryTree={inventoryTree}
                        selectable={false /* TODO */}
                        sortable={false /* TODO sortBy === "custom" */}
                      />
                    ) : (
                      withDo(
                        inventoryTreeNode.children.find(
                          (each) => each.inventoryId === entry.inventoryId
                        ),
                        (subInventoryTreeNode) =>
                          subInventoryTreeNode &&
                          (subInventoryTreeNode.ownerId === myself.id ||
                            subInventoryTreeNode.visibility === "everyone" ||
                            subInventoryTreeNode.visibility ===
                              "everyone-inherited") && (
                            <InventoryEntryInventoryLink
                              key={entry.id}
                              nestingLevel={nestingLevel}
                              inventoryLink={entry}
                              inventoryTree={inventoryTree}
                              inventoryTreeNode={subInventoryTreeNode}
                              myself={myself}
                            />
                          )
                      )
                    )
                  )}
                  {sortedItems.length === 0 && (
                    <li className="text-xs px-3 flex">
                      <span className="font-mono text-rr-400">
                        {Array.from({ length: nestingLevel })
                          .fill("│")
                          .join(" ")}{" "}
                      </span>
                      <em className="text-center flex-1">
                        {inventory.name} is empty.
                      </em>
                    </li>
                  )}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </div>
        </>
      )}
    </>
  );
});

function InventoryVisibilityIcon({
  inventoryTreeNode,
  myself,
}: {
  inventoryTreeNode: InventoryTreeNode;
  myself: Pick<RRPlayer, "id">;
}) {
  const ownerName = useServerState(
    (state) => state.players.entities[inventoryTreeNode.ownerId]?.name
  );
  const { visibility } = inventoryTreeNode;
  const visibilityEveryone =
    visibility === "everyone" || visibility === "everyone-inherited";
  const visibilityInherited =
    visibility === "everyone-inherited" || visibility === "myself-inherited";

  return (
    <>
      {myself.id !== inventoryTreeNode.ownerId ? (
        <RRTooltip
          placement="bottom"
          content={`shared with me by ${ownerName ?? "unknown user"}`}
        >
          <RRFontAwesomeIcon icon={faShareAlt} />
        </RRTooltip>
      ) : (
        <RRTooltip
          placement="bottom"
          content={
            visibilityEveryone
              ? "visible to everyone" +
                (visibilityInherited ? " (inherited from parent group)" : "")
              : "visible just to you and GMs" +
                (visibilityInherited ? " (inherited from parent group)" : "")
          }
        >
          <RRFontAwesomeIcon
            icon={visibilityEveryone ? faUsers : faLock}
            opacity={visibilityInherited ? 0.3 : undefined}
          />
        </RRTooltip>
      )}
    </>
  );
}

function InventoryActions({ inventory }: { inventory: RRInventory }) {
  const dispatch = useServerDispatch();
  const prompt = usePrompt();

  const newItem = async () => {
    const name = (await prompt("What item do you want to add?"))?.trim() ?? "";
    if (name.length === 0) return;

    dispatch(
      inventoryAddItemEntry(inventory.id, {
        type: "item",
        name,
        amount: 1,
        weight: null,
        notes: "",
      })
    );
  };

  const newSubInventory = async () => {
    const name =
      (
        await prompt(
          'What is the name of this group of items (e.g. "Backpack")?'
        )
      )?.trim() ?? "";
    if (name.length === 0) return;

    const subInventory = inventoryAdd({
      name,
      visibility: "inherited",
      entries: EMPTY_ENTITY_COLLECTION,
    });

    dispatch([
      subInventory,
      inventoryAddInventoryLinkEntry(inventory.id, {
        type: "inventoryLink",
        inventoryId: subInventory.payload.id,
      }),
    ]);
  };

  return (
    <>
      {process.env.NODE_ENV !== "production" && (
        <Button
          unstyled
          className="bg-rr-900 px-1 mr-2"
          onClick={async () => {
            const faker = (await import("@faker-js/faker")).faker;
            const actions = [];
            for (let i = 0; i < 10; i++) {
              actions.push(
                inventoryAddItemEntry(inventory.id, {
                  type: "item",
                  name: faker.company.name(),
                  amount: faker.datatype.number({ min: 1, max: 20 }),
                  notes:
                    faker.helpers.maybe(() => faker.lorem.paragraph(), {
                      probability: 0.2,
                    }) ?? "",
                  weight:
                    faker.helpers.maybe(
                      () =>
                        faker.datatype.number({
                          min: 0.25,
                          max: 4,
                          precision: 0.25,
                        }),
                      { probability: 0.8 }
                    ) ?? null,
                })
              );
            }
            dispatch(actions);
          }}
        >
          <FontAwesomeIcon icon={faBug} className="mr-1 text-sm " />
          add 10 random items
        </Button>
      )}
      <Button unstyled className="bg-rr-900 px-1 mr-2" onClick={newItem}>
        <FontAwesomeIcon icon={faPlus} className="mr-1 text-sm" />
        add item
      </Button>
      <Button
        unstyled
        className="bg-rr-900 px-1 mr-2"
        onClick={newSubInventory}
      >
        <FontAwesomeIcon icon={faPlus} className="mr-1 text-sm" />
        add item group
      </Button>
    </>
  );
}
