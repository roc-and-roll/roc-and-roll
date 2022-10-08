import {
  EntityCollection,
  entries,
  RRInventory,
  RRInventoryID,
  RRPlayer,
  RRPlayerID,
} from "./state";

export type CalculatedInventoryVisibility =
  | "everyone"
  | "myself"
  | "everyone-inherited"
  | "myself-inherited";

// Lot's of room for improvement in the following data structures, but it's a
// start.

export class InventoryTreeNode {
  public children: InventoryTreeNode[] = [];

  constructor(
    public readonly inventoryId: RRInventoryID,
    public readonly ownerId: RRPlayerID,
    public readonly visibility: CalculatedInventoryVisibility,
    public readonly parent: InventoryTreeNode | null
  ) {}

  public getPath(): RRInventoryID[] {
    return [this.inventoryId, ...(this.parent?.getPath() ?? [])];
  }
}

export class InventoryTree {
  constructor(public readonly playerInventories: InventoryTreeNode[]) {}

  public getVisibleRootInventoriesFor(player: Pick<RRPlayer, "id" | "isGM">) {
    return [
      ...this.playerInventories.filter((each) => each.ownerId === player.id),
      ...this.playerInventories
        .filter((each) => each.ownerId !== player.id)
        .flatMap((rootInventory) => {
          if (player.isGM) {
            return rootInventory;
          }

          const sharedNodes: InventoryTreeNode[] = [];
          this.visitNode(rootInventory, (node) => {
            if (node.visibility === "everyone") {
              sharedNodes.push(node);
            }
          });
          return sharedNodes;
        }),
    ];
  }

  public getAllVisibleInventoryNodesRecursive(
    player: Pick<RRPlayer, "id" | "isGM">
  ) {
    const visibleNodes: InventoryTreeNode[] = [];
    this.playerInventories.forEach((root) => {
      this.visitNode(root, (node) => {
        if (
          player.isGM ||
          node.ownerId === player.id ||
          node.visibility === "everyone" ||
          node.visibility === "everyone-inherited"
        ) {
          visibleNodes.push(node);
        }
      });
    });
    return visibleNodes;
  }

  private visitNode(
    root: InventoryTreeNode,
    visitor: (node: InventoryTreeNode) => void
  ) {
    visitor(root);
    root.children.forEach((each) => this.visitNode(each, visitor));
  }

  public visit(visitor: (node: InventoryTreeNode) => void) {
    this.playerInventories.forEach((root) => this.visitNode(root, visitor));
  }
}

export function buildInventoryTree(
  playerInventories: Array<{
    playerId: RRPlayerID;
    inventoryIds: RRInventoryID[];
  }>,
  inventories: EntityCollection<RRInventory>
): InventoryTree {
  const tree = new InventoryTree([]);

  for (const { playerId, inventoryIds } of playerInventories) {
    for (const inventoryId of inventoryIds) {
      const inventory = inventories.entities[inventoryId];
      if (!inventory) {
        continue;
      }
      const visibility =
        inventory.visibility === "inherited"
          ? // Default to private invisibility for a player's root inventories.
            "myself"
          : inventory.visibility;
      const node = new InventoryTreeNode(
        inventoryId,
        playerId,
        visibility,
        null
      );
      node.children = buildChildNodes(
        node,
        inventory,
        playerId,
        visibility,
        inventories
      );
      tree.playerInventories.push(node);
    }
  }

  return tree;
}

function buildChildNodes(
  parentNode: InventoryTreeNode,
  parentInventory: RRInventory,
  parentOwnerId: RRPlayerID,
  parentVisibility: CalculatedInventoryVisibility,
  inventories: EntityCollection<RRInventory>
): InventoryTreeNode[] {
  const nodes: InventoryTreeNode[] = [];
  for (const entry of entries(parentInventory.entries)) {
    if (entry.type === "inventoryLink") {
      const inventory = inventories.entities[entry.inventoryId];
      if (!inventory) {
        continue;
      }
      const visibility =
        inventory.visibility === "inherited"
          ? parentVisibility === "everyone-inherited" ||
            parentVisibility === "myself-inherited"
            ? parentVisibility
            : (`${parentVisibility}-inherited` as const)
          : inventory.visibility;
      const node = new InventoryTreeNode(
        inventory.id,
        parentOwnerId,
        visibility,
        parentNode
      );
      node.children = buildChildNodes(
        node,
        inventory,
        parentOwnerId,
        visibility,
        inventories
      );
      nodes.push(node);
    }
  }

  return nodes;
}
