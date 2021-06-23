import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MapMusicIndicator } from "./MapMusicIndicator";
import { ServerStateProvider } from "../../state";
import { MockClientSocket } from "../../test-utils";
import { rrid } from "../../../shared/util";
import {
  EMPTY_ENTITY_COLLECTION,
  makeEntityCollection,
  RRActiveSong,
} from "../../../shared/state";

describe("MapMusicIndicator", () => {
  it("works", () => {
    const mockSocket = new MockClientSocket();

    const { unmount } = render(
      <ServerStateProvider socket={mockSocket.__cast()}>
        <MapMusicIndicator mapBackgroundColor="orange" />
      </ServerStateProvider>
    );

    expect(
      screen.queryByTitle("Now playing:", { exact: false })
    ).not.toBeInTheDocument();

    const id1 = rrid<RRActiveSong>();

    act(() => {
      mockSocket.__receiveSetState({
        ephemeral: {
          players: EMPTY_ENTITY_COLLECTION,
          activeSongs: makeEntityCollection({
            entities: {
              [id1]: {
                id: id1,
                song: {
                  name: "test song",
                },
              },
            },
            ids: [id1],
          }),
        },
      });
    });

    expect(
      screen.queryByTitle("Now playing:", { exact: false })
    ).toBeInTheDocument();
    expect(screen.queryByText("test song")).toBeInTheDocument();

    act(() => {
      jest.runAllTimers();
    });
    expect(
      screen
        .queryByTitle("Now playing:", { exact: false })
        ?.querySelector(".is-timeouted")
    ).toBeInTheDocument();

    act(() => {
      const id2 = rrid<RRActiveSong>();

      mockSocket.__receiveSetState({
        ephemeral: {
          players: EMPTY_ENTITY_COLLECTION,
          activeSongs: makeEntityCollection({
            entities: {
              [id1]: {
                id: id1,
                song: {
                  name: "test song",
                },
              },
              [id2]: {
                id: id2,
                song: {
                  name: "another song",
                },
              },
            },
            ids: [id1, id2],
          }),
        },
      });
    });

    expect(screen.queryByText("test song, another song")).toBeInTheDocument();

    act(() => {
      jest.runAllTimers();
    });
    expect(
      screen
        .queryByTitle("Now playing:", { exact: false })
        ?.querySelector(".is-timeouted")
    ).toBeInTheDocument();

    unmount();
  });
});
