import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MapMusicIndicator } from "./MapMusicIndicator";
import { MockClientSocket } from "../../test-utils";
import { rrid } from "../../../shared/util";
import {
  EMPTY_ENTITY_COLLECTION,
  RRActiveSongOrSoundSet,
  RRAssetSong,
  RRPlayer,
} from "../../../shared/state";
import { RecoilRoot } from "recoil";
import { CampaignEntity } from "../../../shared/campaign";
import { CampaignAndServerStateProvider } from "../../campaign";

describe("MapMusicIndicator", () => {
  it("works", () => {
    const mockSocket = new MockClientSocket();

    const { unmount } = render(
      <RecoilRoot>
        <CampaignAndServerStateProvider
          forTestingInitialState={{
            campaign: { id: rrid<CampaignEntity>(), name: "Campaign" },
            socket: mockSocket.__cast(),
          }}
        >
          <MapMusicIndicator mapBackgroundColor="orange" />
        </CampaignAndServerStateProvider>
      </RecoilRoot>
    );

    expect(
      screen.queryByTitle("Now playing:", { exact: false })
    ).not.toBeInTheDocument();

    const songId1 = rrid<RRAssetSong>();
    const activeSongId1 = rrid<RRActiveSongOrSoundSet>();

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
        assets: {
          entities: {
            [songId1]: {
              name: "test song",
            },
          },
          ids: [songId1],
        },
        ephemeral: {
          players: EMPTY_ENTITY_COLLECTION,
          activeMusic: {
            entities: {
              [activeSongId1]: {
                id: activeSongId1,
                type: "song",
                songId: songId1,
                addedBy: playerId,
              },
            },
            ids: [activeSongId1],
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
      const songId2 = rrid<RRAssetSong>();
      const activeSongId2 = rrid<RRActiveSongOrSoundSet>();

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
        assets: {
          entities: {
            [songId1]: {
              name: "test song",
            },
            [songId2]: {
              name: "another song",
            },
          },
          ids: [songId1, songId2],
        },
        ephemeral: {
          players: EMPTY_ENTITY_COLLECTION,
          activeMusic: {
            entities: {
              [activeSongId1]: {
                id: activeSongId1,
                type: "song",
                songId: songId1,
                addedBy: playerId,
              },
              [activeSongId2]: {
                id: activeSongId2,
                type: "song",
                songId: songId2,
                addedBy: doesNotExistPlayerId,
              },
            },
            ids: [activeSongId1, activeSongId2],
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
