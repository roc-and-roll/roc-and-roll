import React from "react";
import { act, renderHook } from "@testing-library/react-hooks";
import { ServerStateProvider, applyStatePatch, useServerState } from "./state";
import {
  byId,
  defaultMap,
  EMPTY_ENTITY_COLLECTION,
  initialSyncedState,
  RRMap,
  RRMapObject,
  RRPlayer,
  RRPlayerID,
  SyncedState,
} from "../shared/state";
import { rrid } from "../shared/util";
import { MockClientSocket } from "./test-utils";
import { Socket } from "socket.io-client";

function setup<A extends Record<string, unknown>, H>(
  initialProps: A,
  hookCreator: (hookArgs: A) => H
) {
  const mockSocket = new MockClientSocket();
  const socket = mockSocket.__cast();
  const wrapper = ({
    children,
    socket,
  }: React.PropsWithChildren<{ socket: Socket }>) => {
    return (
      <ServerStateProvider socket={socket}>{children}</ServerStateProvider>
    );
  };

  const {
    result,
    rerender,
    unmount,
    waitFor,
    waitForNextUpdate,
    waitForValueToChange,
  } = renderHook<
    A & {
      socket: Socket;
    },
    H
  >((hookArgs) => hookCreator(hookArgs), {
    wrapper,
    initialProps: {
      ...initialProps,
      socket,
    },
  });

  return {
    mockSocket,
    socket,
    result,
    rerender: (props: A) => rerender({ ...props, socket }),
    unmount,
    waitFor,
    waitForNextUpdate,
    waitForValueToChange,
  };
}

describe("applyStatePatch", () => {
  it("works", () => {
    let prevState: SyncedState = {
      ...initialSyncedState,
      maps: {
        ...initialSyncedState.maps,
        entities: {
          ...initialSyncedState.maps.entities,
        },
        ids: [...initialSyncedState.maps.ids],
      },
    };
    const newMap: RRMap = {
      id: rrid<RRMap>(),
      settings: {
        name: "map",
        backgroundColor: "#eee",
        gmWorldPosition: { x: 0, y: 0 },
        gridEnabled: true,
        gridColor: "#808080",
        revealedAreas: null,
      },
      objects: EMPTY_ENTITY_COLLECTION,
    };
    let nextState = applyStatePatch(prevState, {
      deletedKeys: [],
      patch: {
        maps: {
          entities: {
            [newMap.id]: newMap,
          },
          ids: [defaultMap.id, newMap.id],
        },
      },
    });

    expect(nextState).not.toStrictEqual(prevState);
    expect(nextState.maps).not.toStrictEqual(prevState.maps);
    expect(nextState.maps.entities).not.toStrictEqual(prevState.maps.entities);
    expect(byId(nextState.maps.entities, newMap.id)).toStrictEqual(newMap);
    expect(byId(nextState.maps.entities, defaultMap.id)).toStrictEqual(
      byId(prevState.maps.entities, defaultMap.id)
    );
    expect(nextState.maps.ids).not.toStrictEqual(prevState.maps.ids);
    expect(nextState.maps.ids).toEqual([defaultMap.id, newMap.id]);

    expect(nextState.players).toStrictEqual(prevState.players);

    const newMapObject1: RRMapObject = {
      id: rrid<RRMapObject>(),
      type: "rectangle",
      color: "#123",
      locked: false,
      playerId: rrid<RRPlayer>(),
      position: { x: 0, y: 0 },
      rotation: 0,
      size: { x: 0, y: 0 },
      visibility: "everyone",
    };

    nextState = applyStatePatch((prevState = nextState), {
      deletedKeys: [],
      patch: {
        maps: {
          entities: {
            [newMap.id]: {
              objects: {
                entities: {
                  [newMapObject1.id]: newMapObject1,
                },
                ids: [newMapObject1.id],
              },
            },
          },
        },
      },
    });

    expect(nextState).not.toStrictEqual(prevState);
    expect(nextState.maps).not.toStrictEqual(prevState.maps);
    expect(nextState.maps.entities).not.toStrictEqual(prevState.maps.entities);
    expect(byId(nextState.maps.entities, newMap.id)).not.toStrictEqual(newMap);
    expect(byId(nextState.maps.entities, newMap.id)!.objects).not.toStrictEqual(
      newMap.objects
    );
    expect(
      byId(
        byId(nextState.maps.entities, newMap.id)!.objects.entities,
        newMapObject1.id
      )
    ).toStrictEqual(newMapObject1);
    expect(byId(nextState.maps.entities, defaultMap.id)).toStrictEqual(
      byId(prevState.maps.entities, defaultMap.id)
    );

    expect(nextState.players).toStrictEqual(prevState.players);

    const newMapObject2: RRMapObject = {
      id: rrid<RRMapObject>(),
      type: "rectangle",
      color: "#456",
      locked: false,
      playerId: rrid<RRPlayer>(),
      position: { x: 0, y: 0 },
      rotation: 0,
      size: { x: 0, y: 0 },
      visibility: "everyone",
    };

    nextState = applyStatePatch((prevState = nextState), {
      deletedKeys: [],
      patch: {
        maps: {
          entities: {
            [newMap.id]: {
              objects: {
                entities: {
                  [newMapObject2.id]: newMapObject2,
                },
                ids: [...newMap.objects.ids, newMapObject2.id],
              },
            },
          },
        },
      },
    });

    expect(nextState).not.toStrictEqual(prevState);
    expect(nextState.maps).not.toStrictEqual(prevState.maps);
    expect(nextState.maps.entities).not.toStrictEqual(prevState.maps.entities);
    expect(byId(nextState.maps.entities, newMap.id)).not.toStrictEqual(newMap);
    expect(byId(nextState.maps.entities, newMap.id)!.objects).not.toStrictEqual(
      newMap.objects
    );
    expect(
      byId(
        byId(nextState.maps.entities, newMap.id)!.objects.entities,
        newMapObject1.id
      )
    ).toStrictEqual(newMapObject1);
    expect(
      byId(
        byId(nextState.maps.entities, newMap.id)!.objects.entities,
        newMapObject2.id
      )
    ).toStrictEqual(newMapObject2);
    expect(byId(nextState.maps.entities, defaultMap.id)).toStrictEqual(
      byId(prevState.maps.entities, defaultMap.id)
    );

    expect(nextState.players).toStrictEqual(prevState.players);
  });
});

describe("useServerState", () => {
  function setupUseServerState(initialProps: {
    selector: (state: SyncedState) => unknown;
  }) {
    return setup(initialProps, ({ selector }) => useServerState(selector));
  }

  it("re-executes the selector on every render", () => {
    const { result, rerender, mockSocket } = setupUseServerState({
      selector: (state) => state.players,
    });

    expect(result.current).toEqual(EMPTY_ENTITY_COLLECTION);

    act(() => {
      mockSocket.__receivePatchState({
        deletedKeys: [],
        patch: {
          players: {
            entities: { a: { id: "a" }, b: { id: "b" } },
            ids: ["a" as RRPlayerID, "b" as RRPlayerID],
          },
        },
      });
    });

    expect(result.current).toEqual({
      entities: { a: { id: "a" }, b: { id: "b" } },
      ids: ["a", "b"],
    });

    rerender({
      selector: (state) => byId(state.players.entities, "a" as RRPlayerID),
    });

    expect(result.current).toEqual({ id: "a" });

    rerender({
      selector: (state) => byId(state.players.entities, "b" as RRPlayerID),
    });

    expect(result.current).toEqual({ id: "b" });
  });
});
