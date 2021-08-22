import React from "react";
import { act, renderHook } from "@testing-library/react-hooks";
import {
  ServerStateProvider,
  applyStatePatch,
  useServerState,
  OptimisticActionAppliers,
  OptimisticActionApplier,
  OptimisticActionApplierDispatcherKey,
} from "./state";
import {
  defaultMap,
  EMPTY_ENTITY_COLLECTION,
  initialSyncedState,
  OptimisticUpdateID,
  RRMap,
  RRMapObject,
  RRPlayer,
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
    expect(nextState.maps.entities[newMap.id]).toStrictEqual(newMap);
    expect(nextState.maps.entities[defaultMap.id]).toStrictEqual(
      prevState.maps.entities[defaultMap.id]
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
    expect(nextState.maps.entities[newMap.id]).not.toStrictEqual(newMap);
    expect(nextState.maps.entities[newMap.id]!.objects).not.toStrictEqual(
      newMap.objects
    );
    expect(
      nextState.maps.entities[newMap.id]!.objects.entities[newMapObject1.id]
    ).toStrictEqual(newMapObject1);
    expect(nextState.maps.entities[defaultMap.id]).toStrictEqual(
      prevState.maps.entities[defaultMap.id]
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
    expect(nextState.maps.entities[newMap.id]).not.toStrictEqual(newMap);
    expect(nextState.maps.entities[newMap.id]!.objects).not.toStrictEqual(
      newMap.objects
    );
    expect(
      nextState.maps.entities[newMap.id]!.objects.entities[newMapObject1.id]
    ).toStrictEqual(newMapObject1);
    expect(
      nextState.maps.entities[newMap.id]!.objects.entities[newMapObject2.id]
    ).toStrictEqual(newMapObject2);
    expect(nextState.maps.entities[defaultMap.id]).toStrictEqual(
      prevState.maps.entities[defaultMap.id]
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

    const A = rrid<RRPlayer>();
    const B = rrid<RRPlayer>();

    act(() => {
      mockSocket.__receivePatchState({
        deletedKeys: [],
        patch: {
          players: {
            entities: { [A]: { id: A }, [B]: { id: B } },
            ids: [A, B],
          },
        },
      });
    });

    expect(result.current).toEqual({
      entities: { [A]: { id: A }, [B]: { id: B } },
      ids: [A, B],
    });

    rerender({
      selector: (state) => state.players.entities[A],
    });

    expect(result.current).toEqual({ id: A });

    rerender({
      selector: (state) => state.players.entities[B],
    });

    expect(result.current).toEqual({ id: B });
  });
});

describe("OptimisticActionAppliers", () => {
  it("calculates deduplication keys correctly", () => {
    const applier: OptimisticActionApplier = {
      dispatcherKey: "dkey" as OptimisticActionApplierDispatcherKey,
      key: "key",
      optimisticUpdateId: "oui" as OptimisticUpdateID,
      actions: [],
    };
    expect(OptimisticActionAppliers.getDeduplicationKey(applier)).toBe(
      `dkey/key`
    );
  });

  it("works", () => {
    const oAA = new OptimisticActionAppliers();

    expect(oAA.appliers()).toHaveLength(0);

    expect(
      oAA.deleteByOptimisticUpdateId(rrid<{ id: OptimisticUpdateID }>())
    ).toBe(false);

    const applier1: OptimisticActionApplier = {
      dispatcherKey: rrid<{ id: OptimisticActionApplierDispatcherKey }>(),
      key: "key",
      optimisticUpdateId: rrid<{ id: OptimisticUpdateID }>(),
      actions: [],
    };
    const whenDoneOrDiscarded1 = jest.fn();
    oAA.add(applier1, whenDoneOrDiscarded1);

    {
      const appliers = oAA.appliers();
      expect(appliers).toHaveLength(1);
      expect(appliers[0]).toBe(applier1);
    }

    const applier2: OptimisticActionApplier = {
      dispatcherKey: rrid<{ id: OptimisticActionApplierDispatcherKey }>(),
      key: "key",
      optimisticUpdateId: rrid<{ id: OptimisticUpdateID }>(),
      actions: [],
    };
    const whenDoneOrDiscarded2 = jest.fn();
    oAA.add(applier2, whenDoneOrDiscarded2);

    {
      const appliers = oAA.appliers();
      expect(appliers).toHaveLength(2);
      expect(appliers[0]).toBe(applier1);
      expect(appliers[1]).toBe(applier2);
    }

    const applier3: OptimisticActionApplier = {
      dispatcherKey: rrid<{ id: OptimisticActionApplierDispatcherKey }>(),
      key: "key",
      optimisticUpdateId: rrid<{ id: OptimisticUpdateID }>(),
      actions: [],
    };
    const whenDoneOrDiscarded3 = jest.fn();
    oAA.add(applier3, whenDoneOrDiscarded3);

    {
      const appliers = oAA.appliers();
      expect(appliers).toHaveLength(3);
      expect(appliers[0]).toBe(applier1);
      expect(appliers[1]).toBe(applier2);
      expect(appliers[2]).toBe(applier3);
    }

    // Add another applier that has the same deduplication key as applier2.
    const applier4 = { ...applier2 };
    const whenDoneOrDiscarded4 = jest.fn();
    oAA.add(applier4, whenDoneOrDiscarded4);

    {
      const appliers = oAA.appliers();
      expect(appliers).toHaveLength(3);
      expect(appliers[0]).toBe(applier1);
      expect(appliers[1]).toBe(applier3);
      expect(appliers[2]).toBe(applier4);
    }

    expect(whenDoneOrDiscarded1).not.toHaveBeenCalled();
    expect(whenDoneOrDiscarded2).toHaveBeenCalledTimes(1);
    expect(whenDoneOrDiscarded3).not.toHaveBeenCalled();
    expect(whenDoneOrDiscarded4).not.toHaveBeenCalled();

    // Delete all appliers with the optimistic update id of applier3.
    oAA.deleteByOptimisticUpdateId(applier3.optimisticUpdateId);
    {
      const appliers = oAA.appliers();
      expect(appliers).toHaveLength(2);
      expect(appliers[0]).toBe(applier1);
      expect(appliers[1]).toBe(applier4);
    }

    expect(whenDoneOrDiscarded1).not.toHaveBeenCalled();
    expect(whenDoneOrDiscarded2).toHaveBeenCalledTimes(1);
    expect(whenDoneOrDiscarded3).toHaveBeenCalledTimes(1);
    expect(whenDoneOrDiscarded4).not.toHaveBeenCalled();

    oAA.deleteApplier(applier1);
    {
      const appliers = oAA.appliers();
      expect(appliers).toHaveLength(1);
      expect(appliers[0]).toBe(applier4);
    }

    expect(whenDoneOrDiscarded1).toHaveBeenCalledTimes(1);
    expect(whenDoneOrDiscarded2).toHaveBeenCalledTimes(1);
    expect(whenDoneOrDiscarded3).toHaveBeenCalledTimes(1);
    expect(whenDoneOrDiscarded4).not.toHaveBeenCalled();
  });
});
