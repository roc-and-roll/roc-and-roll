import { writeFile } from "fs/promises";
import prompts from "prompts";
import {
  EMPTY_ENTITY_COLLECTION,
  EntityCollection,
  entries,
  makeDefaultMap,
  RRCharacter,
  RRInventory,
  RRPlayer,
  RRPlayerID,
  SyncedState,
} from "../shared/state";
import { MyStore } from "./setupReduxStore";
import {
  InventoryTree,
  InventoryTreeNode,
  buildInventoryTree,
} from "../shared/inventory-tree";

export async function extractForOneShot(
  store: MyStore,
  outputFilePath: string
) {
  console.log("Extracting data for one shot");
  const state = store.getState();

  const response = await prompts(
    [
      {
        //cspell: disable-next-line
        type: "multiselect",
        name: "playerIds",
        message: "Pick players to export",
        choices: entries(state.players).map((player) => ({
          title: `${player.name}${player.isGM ? " (GM)" : ""}`,
          value: player.id,
          selected: !player.isGM,
        })),
        // @ts-expect-error This is apparently not typed correctly
        instructions: false,
      },
    ],
    {
      onCancel: () => process.exit(1),
    }
  );

  const playerIds = response.playerIds as RRPlayerID[];
  const players = entries(state.players).filter((player) =>
    playerIds.includes(player.id)
  );

  const defaultMap = makeDefaultMap();

  const playerInventories = players.map((player) => ({
    playerId: player.id,
    inventoryIds: player.inventoryIds,
  }));
  const inventoryTree = buildInventoryTree(
    playerInventories,
    state.inventories
  );

  const exportedState: SyncedState = {
    version: state.version,
    globalSettings: state.globalSettings,
    initiativeTracker: {
      currentEntryId: null,
      entries: EMPTY_ENTITY_COLLECTION,
      visible: false,
    },
    players: {
      entities: Object.fromEntries(
        players.map((player) => [
          player.id,
          { ...player, currentMap: defaultMap.id },
        ])
      ),
      ids: [...playerIds],
    },
    inventories: filterInventories(inventoryTree, state.inventories),
    characters: filterCharacters(state.characters, players),
    maps: {
      entities: {
        [defaultMap.id]: defaultMap,
      },
      ids: [defaultMap.id],
    },
    privateChats: EMPTY_ENTITY_COLLECTION,
    logEntries: EMPTY_ENTITY_COLLECTION,
    assets: state.assets,
    soundSets: state.soundSets,
    ephemeral: {
      activeMusic: EMPTY_ENTITY_COLLECTION,
      players: EMPTY_ENTITY_COLLECTION,
    },
  };

  await writeFile(outputFilePath, JSON.stringify(exportedState), "utf-8");
}

function fromEntries<K extends string, V>(
  entries: Array<[K, V]>
): Record<K, V> {
  // @ts-expect-error Object.fromEntries types keys as string
  return Object.fromEntries(entries);
}

function filterCharacters<T extends RRCharacter>(
  entityCollection: EntityCollection<T>,
  players: RRPlayer[]
): EntityCollection<T> {
  const entities = entries(entityCollection).filter((entity) =>
    players.some((player) => player.characterIds.includes(entity.id))
  );

  return {
    entities: fromEntries(entities.map((entity) => [entity.id, entity])),
    ids: entities.map((entity) => entity.id),
  };
}

function filterInventories(
  inventoryTree: InventoryTree,
  entityCollection: EntityCollection<RRInventory>
): EntityCollection<RRInventory> {
  const visibleNodes: InventoryTreeNode[] = [];
  inventoryTree.visit((node) => visibleNodes.push(node));

  const entities = entries(entityCollection).filter((entity) =>
    visibleNodes.some((node) => node.inventoryId === entity.id)
  );

  return {
    entities: fromEntries(entities.map((entity) => [entity.id, entity])),
    ids: entities.map((entity) => entity.id),
  };
}
