import { Socket } from "socket.io-client";
import { SOCKET_PATCH_STATE, SOCKET_SET_STATE } from "../shared/constants";
import { OptimisticUpdateID, SyncedState } from "../shared/state";
import { StatePatch } from "./state";

type Subscriber = (payload: any) => void;
type OnEmitSubscriber = (name: string, payload: any) => void;

export class MockClientSocket {
  //////
  // Socket Events
  //////

  private socketSubscribers = new Map<string, Set<Subscriber>>();

  public on(name: string, subscriber: Subscriber) {
    if (!this.socketSubscribers.has(name)) {
      this.socketSubscribers.set(name, new Set());
    }
    this.socketSubscribers.get(name)!.add(subscriber);
  }

  public off(name: string, subscriber: Subscriber) {
    this.socketSubscribers.get(name)?.delete(subscriber);
  }

  public emit(name: string, action: string) {
    this.__onEmitSubscribers.forEach((subscriber) => subscriber(name, action));
  }

  public __receiveFromServer(name: string, payload: any) {
    this.socketSubscribers
      .get(name)
      ?.forEach((subscriber) => subscriber(payload));
  }

  private __onEmitSubscribers = new Set<OnEmitSubscriber>();

  public __onEmitToServerSubscriberAdd(subscriber: OnEmitSubscriber) {
    this.__onEmitSubscribers.add(subscriber);
  }

  // Helpers for SET_STATE / PATCH_STATE

  public __receiveSetState(
    state: Partial<SyncedState>,
    finishedOptimisticUpdateIds: OptimisticUpdateID[] = []
  ) {
    this.__receiveFromServer(SOCKET_SET_STATE, {
      state: JSON.stringify(state),
      finishedOptimisticUpdateIds,
    });
  }

  public __receivePatchState(
    patch: StatePatch<SyncedState>,
    finishedOptimisticUpdateIds: OptimisticUpdateID[] = []
  ) {
    this.__receiveFromServer(SOCKET_PATCH_STATE, {
      patch: JSON.stringify(patch),
      finishedOptimisticUpdateIds,
    });
  }

  //////
  // IO/Manager Events
  //////

  private ioSubscribers = new Map<string, Set<Subscriber>>();

  public io = {
    on: (name: string, subscriber: Subscriber) => {
      if (!this.ioSubscribers.has(name)) {
        this.ioSubscribers.set(name, new Set());
      }
      this.ioSubscribers.get(name)!.add(subscriber);
    },
    off: (name: string, subscriber: Subscriber) => {
      this.ioSubscribers.get(name)?.delete(subscriber);
    },
  };

  public __receiveIOEvent(name: string, payload: any) {
    this.ioSubscribers.get(name)?.forEach((subscriber) => subscriber(payload));
  }

  //////
  // Misc
  //////

  public __cast(): Socket {
    return this as unknown as Socket;
  }
}
