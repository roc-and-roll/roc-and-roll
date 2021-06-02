import React from "react";
import { render, screen, act } from "@testing-library/react";
import { ConnectionLost } from "./ConnectionLost";
import { ServerStateProvider } from "../state";
import { MockClientSocket } from "../test-utils";

describe("ConnectionLost", () => {
  it("works", async () => {
    const mockSocket = new MockClientSocket();

    const { unmount } = render(
      <ServerStateProvider socket={mockSocket.__cast()}>
        <ConnectionLost />
      </ServerStateProvider>
    );

    expect(screen.getByRole("heading")).toHaveTextContent("Looks like a TPK");
    expect(
      screen.queryByText("Last reconnection attempt", { exact: false })
    ).not.toBeInTheDocument();

    act(() => {
      mockSocket.__receiveIOEvent("reconnect_attempt", undefined);
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
