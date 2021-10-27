import { faUserCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { privateChatAdd } from "../../../shared/actions";
import { EntityCollection, RRPlayer, entries } from "../../../shared/state";
import { useLoginLogout } from "../../myself";
import { useServerDispatch, useServerState } from "../../state";
import { CharacterPreview } from "../characters/CharacterPreview";
import { Player } from "../Player";
import { Popover } from "../Popover";
import { Chat } from "../privateChat/PrivateChats";
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
  const characters = useServerState((state) => state.characters);
  const [selected, setSelected] = useState(false);
  const { logout } = useLoginLogout();

  let character;
  if (!player.mainCharacterId) character = null;
  else character = characters.entities[player.mainCharacterId];

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

  return (
    <Popover
      content={
        player.id === myself.id ? (
          <Player logout={logout} />
        ) : (
          myChats[0] !== undefined && <Chat id={myChats[0]!.id} />
        )
      }
      visible={selected}
      onClickOutside={() => setSelected(false)}
      interactive
      placement="bottom"
    >
      <div onClick={() => setSelected(!selected)}>
        {player.id !== myself.id && (
          <div
            style={{
              width: "12px",
              height: "12px",
              position: "absolute",
              backgroundColor: "red",
              borderRadius: "12px",
              marginLeft: "52px",
            }}
          ></div>
        )}
        {character ? (
          <CharacterPreview
            character={character}
            title={player.name}
            size={64}
            shouldDisplayShadow={false}
          />
        ) : (
          <FontAwesomeIcon
            icon={faUserCircle}
            title={player.name}
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
      </div>
    </Popover>
  );
});
