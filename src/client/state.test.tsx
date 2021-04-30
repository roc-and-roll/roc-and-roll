import React from "react";
import { renderHook, WrapperComponent } from "@testing-library/react-hooks";
import {
  ServerStateProvider,
  useOptimisticDebouncedServerUpdate,
} from "./state";
import { SyncedStateAction } from "../shared/state";
import { act } from "@testing-library/react-hooks";
import ReactDOM from "react-dom";
import FakeTimers from "@sinonjs/fake-timers";

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

type HookArgs<V> = {
  serverValue: V;
  actionCreator: (
    p: V
  ) =>
    | undefined
    | SyncedStateAction<unknown, string, never>
    | SyncedStateAction<unknown, string, never>[];
  debounceTime: number;
  lerp?: (start: V, end: V, amount: number) => V;
};

function setup<V>(initialProps: HookArgs<V>) {
  const mockSocket = new MockClientSocket();
  const socket = (mockSocket as unknown) as SocketIOClient.Socket;
  const wrapper: WrapperComponent<{ socket: SocketIOClient.Socket }> = ({
    children,
    socket,
  }) => {
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
  } = renderHook(
    ({
      serverValue,
      actionCreator,
      debounceTime,
    }: HookArgs<V> & {
      socket: SocketIOClient.Socket;
    }) =>
      useOptimisticDebouncedServerUpdate(
        serverValue,
        actionCreator,
        debounceTime
      ),
    {
      wrapper,
      initialProps: {
        ...initialProps,
        socket,
      },
    }
  );

  return {
    mockSocket,
    socket,
    result,
    rerender,
    unmount,
    waitFor,
    waitForNextUpdate,
    waitForValueToChange,
  };
}

describe("optimistic state updates", () => {
  let clock: FakeTimers.Clock;

  beforeEach(() => {
    clock = FakeTimers.install();
  });

  afterEach(() => {
    clock.uninstall();
  });

  it("passes through server updates when there is no local update", async () => {
    const { mockSocket, socket, result, rerender, unmount } = setup({
      serverValue: 123,
      actionCreator: () => undefined,
      debounceTime: 100,
    });

    expect(result.current[0]).toBe(123);

    rerender({
      serverValue: 42,
      actionCreator: () => undefined,
      debounceTime: 100,
      socket,
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

    const { mockSocket, socket, result, rerender, unmount } = setup({
      serverValue: 123,
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
      serverValue: 1337,
      actionCreator: makeActionCreator(),
      debounceTime: 100,
      socket,
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

    const { mockSocket, result, unmount } = setup({
      serverValue: 123,
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

    const { result, unmount } = setup({
      serverValue: 0,
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
});
