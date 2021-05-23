import React from "react";
import { act, renderHook } from "@testing-library/react-hooks";
import {
  ServerStateProvider,
  useOptimisticDebouncedServerUpdate,
  applyStatePatch,
  useServerState,
  useOptimisticDebouncedLerpedServerUpdate,
} from "./state";
import {
  byId,
  defaultMap,
  initialSyncedState,
  RRMap,
  RRMapObject,
  RRPlayer,
  RRPlayerID,
  SyncedState,
  SyncedStateAction,
} from "../shared/state";
import ReactDOM from "react-dom";
import FakeTimers from "@sinonjs/fake-timers";
import { EMPTY_ENTITY_COLLECTION, rrid } from "../shared/util";

type Subscriber = (payload: any) => void;
type OnEmitSubscriber = (name: string, payload: any) => void;

class MockClientSocket {
  private subscribers = new Map<string, Set<Subscriber>>();

  public on(name: string, subscriber: Subscriber) {
    if (!this.subscribers.has(name)) {
      this.subscribers.set(name, new Set());
    }
    this.subscribers.get(name)!.add(subscriber);
  }

  public off(name: string, subscriber: Subscriber) {
    if (!this.subscribers.has(name)) {
      this.subscribers.set(name, new Set());
    }
    this.subscribers.get(name)!.delete(subscriber);
  }

  public emit(name: string, action: string) {
    this.__onEmitSubscribers.forEach((subscriber) => subscriber(name, action));
  }

  public __receive(name: string, payload: any) {
    this.subscribers.get(name)?.forEach((subscriber) => subscriber(payload));
  }

  private __onEmitSubscribers = new Set<OnEmitSubscriber>();
  public __onEmit(subscriber: OnEmitSubscriber) {
    this.__onEmitSubscribers.add(subscriber);
  }
}

function setup<A extends Record<string, unknown>, H>(
  initialProps: A,
  hookCreator: (hookArgs: A) => H
) {
  const mockSocket = new MockClientSocket();
  const socket = (mockSocket as unknown) as SocketIOClient.Socket;
  const wrapper = ({
    children,
    socket,
  }: React.PropsWithChildren<{ socket: SocketIOClient.Socket }>) => {
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
      socket: SocketIOClient.Socket;
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

describe("optimistic state updates", () => {
  function setupUseOptimisticDebouncedServerUpdate<V>(initialProps: {
    selector: (state: SyncedState) => V;
    actionCreator: (
      p: V
    ) =>
      | undefined
      | SyncedStateAction<unknown, string, never>
      | SyncedStateAction<unknown, string, never>[];
    debounceTime: number;
  }) {
    return setup(initialProps, ({ selector, actionCreator, debounceTime }) =>
      useOptimisticDebouncedServerUpdate(selector, actionCreator, debounceTime)
    );
  }

  function setupUseOptimisticDebouncedLerpedServerUpdate<V>(initialProps: {
    selector: (state: SyncedState) => V;
    actionCreator: (
      p: V
    ) =>
      | undefined
      | SyncedStateAction<unknown, string, never>
      | SyncedStateAction<unknown, string, never>[];
    debounceTime: number;
    lerp: (start: V, end: V, amount: number) => V;
  }) {
    return setup(
      initialProps,
      ({ selector, actionCreator, debounceTime, lerp }) =>
        useOptimisticDebouncedLerpedServerUpdate(
          selector,
          actionCreator,
          debounceTime,
          lerp
        )
    );
  }

  let clock: FakeTimers.Clock;

  beforeEach(() => {
    clock = FakeTimers.install();
  });

  afterEach(() => {
    clock.uninstall();
  });

  it("passes through server updates when there is no local update", async () => {
    const {
      mockSocket,
      result,
      rerender,
      unmount,
    } = setupUseOptimisticDebouncedServerUpdate({
      selector: () => 123,
      actionCreator: () => undefined,
      debounceTime: 100,
    });

    expect(result.current[0]).toBe(123);

    rerender({
      selector: () => 42,
      actionCreator: () => undefined,
      debounceTime: 100,
    });
    expect(result.current[0]).toBe(42);

    act(() => {
      mockSocket.__receive("SET_STATE", {
        state: JSON.stringify("{}"),
        finishedOptimisticUpdateIds: [],
      });
    });
    expect(result.current[0]).toBe(42);

    unmount();
  });

  it("ignores server updates when there is a local update", async () => {
    function makeActionCreator() {
      return () => ({
        type: "an-action",
        payload: undefined,
      });
    }

    const {
      mockSocket,
      result,
      rerender,
      unmount,
    } = setupUseOptimisticDebouncedServerUpdate({
      selector: () => 123,
      actionCreator: makeActionCreator(),
      debounceTime: 100,
    });

    let updateId: string;
    const onEmit = jest.fn((name, actions) => {
      expect(actions).toHaveLength(1);
      const action = actions[0]!;
      const optimisticUpdateId = action.meta.__optimisticUpdateId__;

      expect(name).toBe("REDUX_ACTION");
      expect(typeof optimisticUpdateId).toBe("string");
      updateId = optimisticUpdateId;
    });
    mockSocket.__onEmit(onEmit);

    expect(result.current[0]).toBe(123);

    // update the state locally
    act(() => {
      result.current[1](42);
    });
    expect(result.current[0]).toBe(42);

    // receive a new state from the server, which should not overwrite the local
    // state
    rerender({
      selector: () => 1337,
      actionCreator: makeActionCreator(),
      debounceTime: 100,
    });
    expect(result.current[0]).toBe(42);

    // trigger a SET_STATE update, which also should not overwrite the local
    // state
    act(() => {
      mockSocket.__receive("SET_STATE", {
        state: JSON.stringify("{}"),
        finishedOptimisticUpdateIds: [],
      });
    });
    expect(result.current[0]).toBe(42);
    expect(onEmit).toBeCalledTimes(0);

    // wait -> now the updated local state should have been sent to the
    // server
    await clock.runToLastAsync();
    expect(clock.now).toBe(100);
    expect(onEmit).toBeCalledTimes(1);

    // trigger a SET_STATE update, which also should not overwrite the local
    // state
    act(() => {
      mockSocket.__receive("SET_STATE", {
        state: JSON.stringify("{}"),
        finishedOptimisticUpdateIds: [],
      });
    });
    expect(result.current[0]).toBe(42);

    // trigger a SET_STATE update again, but this time signal that the local
    // state has been incorporated into the server state -> start rendering
    // state from the server again.
    act(() => {
      mockSocket.__receive("SET_STATE", {
        state: JSON.stringify("{}"),
        finishedOptimisticUpdateIds: [updateId],
      });
    });
    expect(result.current[0]).toBe(1337);

    unmount();

    expect(onEmit).toBeCalledTimes(1);
  });

  it("sends local updates to the server on unmount, even if the debounce time has not been reached", async () => {
    function makeActionCreator() {
      return () => ({
        type: "an-action",
        payload: undefined,
      });
    }

    const {
      mockSocket,
      result,
      unmount,
    } = setupUseOptimisticDebouncedServerUpdate({
      selector: () => 123,
      actionCreator: makeActionCreator(),
      debounceTime: 100,
    });

    const onEmit = jest.fn((name, action) => {
      const optimisticUpdateId = action.meta.__optimisticUpdateId__;

      expect(name).toBe("REDUX_ACTION");
      expect(typeof optimisticUpdateId).toBe("string");
    });
    mockSocket.__onEmit(onEmit);

    expect(result.current[0]).toBe(123);

    // update the state locally
    act(() => {
      result.current[1](42);
    });
    expect(result.current[0]).toBe(42);

    unmount();

    expect(onEmit).toBeCalledTimes(1);
  });

  it("correctly handles rapid local state updates", async () => {
    function makeActionCreator() {
      return () => ({
        type: "an-action",
        payload: undefined,
      });
    }

    const { result, unmount } = setupUseOptimisticDebouncedServerUpdate({
      selector: () => 0,
      actionCreator: makeActionCreator(),
      debounceTime: 100,
    });

    expect(result.current[0]).toBe(0);

    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current[1]((old) => old + 1);
      }
      ReactDOM.unstable_batchedUpdates(() => {
        for (let i = 0; i < 10; i++) {
          result.current[1]((old) => old + 1);
        }
      });
    });
    expect(result.current[0]).toBe(20);

    act(() => {
      for (let i = 21; i < 31; i++) {
        result.current[1](i);
      }
    });
    expect(result.current[0]).toBe(30);

    act(() => {
      ReactDOM.unstable_batchedUpdates(() => {
        for (let i = 31; i < 41; i++) {
          result.current[1](i);
        }
      });
    });
    expect(result.current[0]).toBe(40);

    unmount();
  });

  it("rerenders when the selector changes and returns a different result", async () => {
    function makeActionCreator() {
      return () => ({ type: "an-action", payload: undefined });
    }

    const { result, rerender } = setupUseOptimisticDebouncedLerpedServerUpdate({
      selector: (state) => "foo",
      actionCreator: makeActionCreator(),
      debounceTime: 100,
      lerp: (start, end, amount) => end,
    });

    expect(result.current[0]).toBe("foo");
    expect(result.all).toHaveLength(1);

    rerender({
      selector: (state) => "bar",
      actionCreator: makeActionCreator(),
      debounceTime: 100,
      lerp: (start, end, amount) => end,
    });
    expect(result.current[0]).toBe("foo");
    expect(result.all).toHaveLength(2);

    act(() => {
      clock.runAll();
    });
    expect(clock.now).toBeGreaterThanOrEqual(100);
    expect(result.current[0]).toBe("bar");
    expect(result.all).toHaveLength(3);
  });
});

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
      name: "map",
      backgroundColor: "#eee",
      gmWorldPosition: { x: 0, y: 0 },
      gridEnabled: true,
      gridColor: "#808080",
      revealedAreas: null,
      objects: {
        entities: {},
        ids: [],
      },
    };
    let nextState = applyStatePatch(prevState, {
      deletedKeys: [],
      patch: {
        maps: {
          entities: {
            [newMap.id]: newMap,
          },
          // @ts-expect-error TODO
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
      size: { x: 0, y: 0 },
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
      size: { x: 0, y: 0 },
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
      mockSocket.__receive("PATCH_STATE", {
        patch: JSON.stringify({
          deletedKeys: [],
          patch: {
            players: {
              entities: { a: { id: "a" }, b: { id: "b" } },
              ids: ["a", "b"],
            },
          },
        }),
        finishedOptimisticUpdateIds: [],
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
