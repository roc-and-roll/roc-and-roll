import React from "react";
import { playerAdd } from "../../shared/actions";
import { entries, RRPlayerID } from "../../shared/state";
import { randomColor } from "../../shared/colors";
import { useServerDispatch, useServerState } from "../state";
import "./JoinGame.scss";
import { usePrompt } from "../popup-boxes";
import { CampaignEntity } from "../../shared/campaign";

export const JoinGame = React.memo(function JoinGame({
  login,
  campaign,
  switchCampaign,
}: {
  login: (id: RRPlayerID) => void;
  campaign: CampaignEntity;
  switchCampaign: () => void;
}) {
  const dispatch = useServerDispatch();
  const players = useServerState((state) => state.players);
  const maps = useServerState((s) => s.maps);
  const prompt = usePrompt();

  const joinAsNewPlayer = async () => {
    const name = (await prompt("What is your name?"))?.trim();
    if (name === undefined || name.length === 0) {
      return;
    }
    const action = playerAdd({
      name,
      color: randomColor(),
      currentMap: maps.ids[0]!,
      isGM: false,
      characterIds: [],
      favoritedAssetIds: [],
    });
    dispatch(action);
    login(action.payload.id);
  };

  return (
    <div className="join-wrapper">
      <h1>
        Join <em>{campaign.name}</em>
      </h1>
      <ul role="list">
        {entries(players).map((player) => (
          <li
            key={player.id}
            onClick={() => login(player.id)}
            style={{
              textDecoration: "underline",
              textDecorationColor: player.color,
            }}
          >
            {player.name}
          </li>
        ))}
        <li onClick={joinAsNewPlayer}>
          <em>join as new player</em>
        </li>
        <li onClick={switchCampaign}>
          <em>switch campaign</em>
        </li>
      </ul>
    </div>
  );
});
