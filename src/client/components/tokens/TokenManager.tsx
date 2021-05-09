import React, { useState } from "react";
import {
  playerUpdateAddCharacterId,
  characterAdd,
  characterTemplateAdd,
} from "../../../shared/actions";
import { entries, RRCharacter, RRCharacterID } from "../../../shared/state";
import { generateRandomToken } from "../../files";
import { useServerDispatch, useServerState } from "../../state";
import { useDrag } from "react-dnd";
import { useMyself } from "../../myself";
import { GMArea } from "../GMArea";
import { Popover } from "../Popover";
import { Button } from "../ui/Button";
import { randomName } from "../../../shared/util";
import { TokenEditor } from "./TokenEditor";
import { TokenPreview } from "./TokenPreview";

async function makeNewToken(): Promise<Parameters<typeof characterAdd>[0]> {
  return {
    auras: [],
    conditions: [],
    hp: 0,
    maxHP: 0,
    scale: 1,
    visibility: "everyone",
    name: await randomName(),
    image: await generateRandomToken(),
  };
}

export function TokenManager() {
  const myself = useMyself();
  const tokens = useServerState((s) => s.characters);
  const [newTokenIds, setNewTokenIds] = useState<RRCharacterID[]>([]);

  const dispatch = useServerDispatch();

  const [isAddingToken, setIsAddingToken] = useState(false);

  const addToken = () => {
    setIsAddingToken(true);
    (async () => {
      const tokenAddAction = characterAdd(await makeNewToken());
      const newToken = tokenAddAction.payload;
      dispatch([
        tokenAddAction,
        playerUpdateAddCharacterId({
          id: myself.id,
          characterId: newToken.id,
        }),
      ]);
      setNewTokenIds((l) => [...l, newToken.id]);
    })().finally(() => setIsAddingToken(false));
  };

  return (
    <>
      <Button onClick={addToken} disabled={isAddingToken}>
        Add Character
      </Button>
      <TokenList
        newTokenIds={newTokenIds}
        setNewTokenIds={setNewTokenIds}
        tokens={entries(tokens).filter((t) =>
          myself.characterIds.includes(t.id)
        )}
      />

      {myself.isGM && <TemplateEditor />}

      {myself.isGM && (
        <GMArea>
          <h4>Tokens of other players</h4>
          <div className="token-list">
            <TokenList
              newTokenIds={newTokenIds}
              setNewTokenIds={setNewTokenIds}
              tokens={entries(tokens).filter(
                (t) => !myself.characterIds.includes(t.id) && !t.localToMap
              )}
            />
          </div>
        </GMArea>
      )}
    </>
  );
}

function TemplateEditor() {
  const [newTokenIds, setNewTokenIds] = useState<RRCharacterID[]>([]);

  const dispatch = useServerDispatch();

  const [isAddingToken, setIsAddingToken] = useState(false);

  const addTemplate = () => {
    setIsAddingToken(true);
    (async () => {
      const tokenAddAction = characterTemplateAdd(await makeNewToken());
      const newToken = tokenAddAction.payload;
      dispatch(tokenAddAction);
      setNewTokenIds((l) => [...l, newToken.id]);
    })().finally(() => setIsAddingToken(false));
  };

  const templates = entries(
    useServerState((state) => state.characterTemplates)
  );

  return (
    <GMArea>
      <div className="clearfix">
        <Button
          style={{ float: "right" }}
          onClick={addTemplate}
          disabled={isAddingToken}
        >
          Add
        </Button>
        <h4>Character Templates</h4>
        <TokenList
          isTemplate={true}
          newTokenIds={newTokenIds}
          setNewTokenIds={setNewTokenIds}
          tokens={templates}
        />
      </div>
    </GMArea>
  );
}

function TokenList({
  tokens,
  newTokenIds,
  setNewTokenIds,
  isTemplate,
}: {
  tokens: RRCharacter[];
  newTokenIds: RRCharacterID[];
  setNewTokenIds: React.Dispatch<React.SetStateAction<RRCharacterID[]>>;
  isTemplate?: boolean;
}) {
  const tokenPreview = (t: RRCharacter) => (
    <EditableTokenPreview
      token={t}
      key={t.id}
      isTemplate={isTemplate}
      wasJustCreated={newTokenIds.includes(t.id)}
      onNameFirstEdited={() =>
        setNewTokenIds((l) => l.filter((id) => id !== t.id))
      }
    />
  );

  return <div className="token-list">{tokens.map(tokenPreview)}</div>;
}

function EditableTokenPreview({
  token,
  onNameFirstEdited,
  wasJustCreated,
  isTemplate,
}: {
  token: RRCharacter;
  onNameFirstEdited: () => void;
  wasJustCreated: boolean;
  isTemplate?: boolean;
}) {
  const [, dragRef] = useDrag<{ id: RRCharacterID }, void, null>(() => ({
    type: isTemplate ? "tokenTemplate" : "token",
    item: { id: token.id },
  }));

  const [selected, setSelected] = useState(wasJustCreated);

  return (
    <Popover
      content={
        <TokenEditor
          isTemplate={isTemplate}
          token={token}
          wasJustCreated={wasJustCreated}
          onNameFirstEdited={onNameFirstEdited}
          onClose={() => setSelected(false)}
        />
      }
      visible={selected}
      onClickOutside={() => setSelected(false)}
      interactive
      placement="right"
    >
      <div
        ref={dragRef}
        className="token-preview"
        onClick={() => setSelected(true)}
      >
        <p>{token.name}</p>
        <TokenPreview token={token} />
      </div>
    </Popover>
  );
}
