import React, { useEffect, useState } from "react";
import { characterAdd, privateChatAdd } from "../../../shared/actions";
import {
  EntityCollection,
  RRPlayer,
  entries,
  RRPlayerID,
} from "../../../shared/state";
import { useLoginLogout } from "../../myself";
import { useServerDispatch, useServerState } from "../../state";
import { CharacterPreview } from "../characters/CharacterPreview";
import { Player } from "../Player";
import { Popover } from "../Popover";
import { Chat } from "../privateChat/PrivateChats";

export const PlayerToolbar = React.memo<{
  myself: RRPlayer;
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
  myself: RRPlayer;
}>(function ToolbarPlayer({ player, myself }) {
  const characters = useServerState((state) => state.characters);
  const [selected, setSelected] = useState(false);
  const { logout } = useLoginLogout();

  if (player.characterIds.length < 1) return null;
  const character = characters.entities[player.characterIds[0]!];
  if (!character) return null;

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
        <CharacterPreview character={character} title={player.name} size={64} />
      </div>
    </Popover>
  );
});

function ToolbarChat({
  player,
  myself,
}: {
  player: RRPlayer;
  myself: RRPlayer;
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
