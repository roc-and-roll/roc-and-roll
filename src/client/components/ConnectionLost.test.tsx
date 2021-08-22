import React from "react";
import { render, screen, act } from "@testing-library/react";
import { ConnectionLost } from "./ConnectionLost";
import { MockClientSocket } from "../test-utils";
import { CampaignAndServerStateProvider } from "../campaign";
import { CampaignEntity } from "../../shared/campaign";
import { rrid } from "../../shared/util";

describe("ConnectionLost", () => {
  it("works", async () => {
    const mockSocket = new MockClientSocket();

    const { unmount } = render(
      <CampaignAndServerStateProvider
        forTestingInitialState={{
          campaign: { id: rrid<CampaignEntity>(), name: "Campaign" },
          socket: mockSocket.__cast(),
        }}
      >
        <ConnectionLost />
      </CampaignAndServerStateProvider>
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
