import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MapMusicIndicator } from "./MapMusicIndicator";
import { ServerStateProvider } from "../../state";
import { MockClientSocket } from "../../test-utils";
import { rrid } from "../../../shared/util";
import {
  EMPTY_ENTITY_COLLECTION,
  RRActiveSong,
  RRPlayer,
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

    const playerId = rrid<RRPlayer>();

    act(() => {
      mockSocket.__receiveSetState({
        players: {
          entities: {
            [playerId]: {
              name: "Ron",
            },
          },
          ids: [playerId],
        },
        ephemeral: {
          players: EMPTY_ENTITY_COLLECTION,
          activeSongs: {
            entities: {
              [id1]: {
                id: id1,
                song: {
                  name: "test song",
                },
                addedBy: playerId,
              },
            },
            ids: [id1],
          },
        },
      });
    });

    expect(
      screen.queryByTitle("Now playing:", { exact: false })
    ).toBeInTheDocument();
    expect(screen.queryByText("test song [Ron]")).toBeInTheDocument();

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

      const doesNotExistPlayerId = rrid<RRPlayer>();

      mockSocket.__receiveSetState({
        players: {
          entities: {
            [playerId]: {
              name: "Ron",
            },
          },
          ids: [playerId],
        },
        ephemeral: {
          players: EMPTY_ENTITY_COLLECTION,
          activeSongs: {
            entities: {
              [id1]: {
                id: id1,
                song: {
                  name: "test song",
                },
                addedBy: playerId,
              },
              [id2]: {
                id: id2,
                song: {
                  name: "another song",
                },
                addedBy: doesNotExistPlayerId,
              },
            },
            ids: [id1, id2],
          },
        },
      });
    });

    expect(
      screen.queryByText("test song [Ron], another song [Unknown Player]")
    ).toBeInTheDocument();

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
