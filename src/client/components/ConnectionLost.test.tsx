import React from "react";
import { render, screen, act } from "@testing-library/react";
import { ConnectionLost } from "./ConnectionLost";
import { ServerStateProvider } from "../state";

describe("ConnectionLost", () => {
  it("works", async () => {
    const reconnectCallbacks = new Set<() => void>();
    const socket = {
      on: jest.fn(),
      off: jest.fn(),
      io: {
        on: jest.fn().mockImplementation((event, callback) => {
          expect(event).toBe("reconnect_attempt");
          reconnectCallbacks.add(callback);
        }),
        off: jest.fn(),
      },
    } as unknown as SocketIOClient.Socket;
    const { unmount } = render(
      <ServerStateProvider socket={socket}>
        <ConnectionLost />
      </ServerStateProvider>
    );

    expect(reconnectCallbacks.size).toBe(1);
    expect(screen.getByRole("heading")).toHaveTextContent("Looks like a TPK");
    expect(
      screen.queryByText("Last reconnection attempt", { exact: false })
    ).not.toBeInTheDocument();

    act(() => {
      reconnectCallbacks.forEach((callback) => callback());
      jest.advanceTimersByTime(1000);
    });

    const element = screen.getByText("Last reconnection attempt", {
      exact: false,
    });
    expect(/\d+/.exec(element.textContent!)![0]).toMatchInlineSnapshot(`"1"`);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(/\d+/.exec(element.textContent!)![0]).toMatchInlineSnapshot(`"2"`);

    unmount();
  });
});
