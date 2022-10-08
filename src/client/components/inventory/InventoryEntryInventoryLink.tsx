import React from "react";
import { RRInventoryEntryInventoryLink, RRPlayer } from "../../../shared/state";
import { useServerState } from "../../state";
import { Inventory } from "./Inventories";
import {
  InventoryTree,
  InventoryTreeNode,
} from "../../../shared/inventory-tree";

export function InventoryEntryInventoryLink({
  inventoryLink,
  inventoryTree,
  inventoryTreeNode,
  nestingLevel,
  myself,
}: {
  inventoryLink: RRInventoryEntryInventoryLink;
  inventoryTree: InventoryTree;
  inventoryTreeNode: InventoryTreeNode;
  nestingLevel: number;
  myself: Pick<RRPlayer, "id" | "inventoryIds" | "isGM">;
}) {
  const inventory = useServerState(
    (state) => state.inventories.entities[inventoryLink.inventoryId]
  );
  if (!inventory) {
    return null;
  }
  return (
    <Inventory
      inventory={inventory}
      inventoryTree={inventoryTree}
      inventoryTreeNode={inventoryTreeNode}
      nestingLevel={nestingLevel + 1}
      myself={myself}
    />
  );
}
