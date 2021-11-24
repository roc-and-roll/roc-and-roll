import { faUserCircle } from "@fortawesome/free-solid-svg-icons";
import React, { useEffect, useState } from "react";
import { privateChatAdd } from "../../../shared/actions";
import { EntityCollection, RRPlayer, entries } from "../../../shared/state";
import { useLoginLogout } from "../../myself";
import { useServerDispatch, useServerState } from "../../state";
import { CharacterPreview } from "../characters/CharacterPreview";
import { Player } from "../Player";
import { Popover } from "../Popover";
import { Chat } from "../privateChat/PrivateChats";
import { RRFontAwesomeIcon } from "../RRFontAwesomeIcon";
import { RRTooltip } from "../RRTooltip";
import { RRPlayerToolProps } from "./MapContainer";

export const PlayerToolbar = React.memo<{
  myself: RRPlayerToolProps;
  players: EntityCollection<RRPlayer>;
}>(function PlayerToolbar({ myself, players }) {
  return (
    <div className={"player-toolbar"}>
      {entries(players).map((player: RRPlayer) => (
        <ToolbarPlayer key={player.id} player={player} myself={myself} />
      ))}
    </div>
  );
});

const ToolbarPlayer = React.memo<{
  player: RRPlayer;
  myself: RRPlayerToolProps;
}>(function ToolbarPlayer({ player, myself }) {
  const character = useServerState((state) =>
    player.mainCharacterId
      ? state.characters.entities[player.mainCharacterId] ?? null
      : null
  );
  const [selected, setSelected] = useState(false);
  const { logout } = useLoginLogout();

  return (
    <Popover
      content={
        player.id === myself.id ? (
          <Player logout={logout} />
        ) : (
          <ToolbarChat player={player} myself={myself} />
        )
      }
      visible={selected}
      onClickOutside={() => setSelected(false)}
      interactive
      placement="bottom"
    >
      <div onClick={() => setSelected(!selected)}>
        <RRTooltip content={player.name} placement="bottom">
          {character ? (
            <CharacterPreview
              character={character}
              title=""
              size={64}
              shouldDisplayShadow={false}
            />
          ) : (
            <RRFontAwesomeIcon
              icon={faUserCircle}
              style={{
                fontSize: "64px",
                backgroundColor: player.color,
                borderColor: player.color,
                borderStyle: "solid",
                borderRadius: "200px",
                borderWidth: "3px",
              }}
            />
          )}
        </RRTooltip>
      </div>
    </Popover>
  );
});

function ToolbarChat({
  player,
  myself,
}: {
  player: RRPlayer;
  myself: RRPlayerToolProps;
}) {
  const { ids: chatIds, entities: chats } = useServerState(
    (state) => state.privateChats
  );
  const dispatch = useServerDispatch();

  const myChats = chatIds
    .map((id) => chats[id]!)
    .filter(
      (chat) =>
        (chat.idA === myself.id && chat.idB === player.id) ||
        (chat.idA === player.id && chat.idB === myself.id)
    );

  useEffect(() => {
    if (myChats.length < 1) {
      const action = privateChatAdd(myself.id, player.id);
      dispatch(action);
    }
  }, [dispatch, myChats, myself.id, player.id]);

  if (myChats.length < 1) return null;
  return <Chat id={myChats[0]!.id}></Chat>;
}
