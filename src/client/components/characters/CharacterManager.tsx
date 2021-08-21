import React, { useState } from "react";
import {
  playerUpdateAddCharacterId,
  characterAdd,
  characterTemplateAdd,
} from "../../../shared/actions";
import {
  entries,
  RRCharacter,
  RRCharacterID,
  RRCharacterTemplate,
} from "../../../shared/state";
import { generateRandomToken } from "../../files";
import { useServerDispatch, useServerState } from "../../state";
import { useDrag } from "react-dnd";
import { useMyself } from "../../myself";
import { GMArea } from "../GMArea";
import { Popover } from "../Popover";
import { Button } from "../ui/Button";
import { randomName } from "../../../shared/util";
import { CharacterEditor } from "./CharacterEditor";
import { CharacterPreview } from "./CharacterPreview";
import { randomColor } from "../../../shared/colors";

async function makeNewCharacter(): Promise<Parameters<typeof characterAdd>[0]> {
  return {
    auras: [],
    conditions: [],
    hp: 0,
    maxHP: 0,
    temporaryHP: 0,
    maxHPAdjustment: 0,
    scale: 1,
    visibility: "everyone",
    attributes: {},
    name: await randomName(),
    tokenImage: await generateRandomToken(),
    tokenBorderColor: randomColor(),
    localToMap: null,
  };
}

export function CharacterManager() {
  const myself = useMyself();
  const characters = useServerState((s) => s.characters);
  const [newCharacterIds, setNewCharacterIds] = useState<RRCharacterID[]>([]);

  const dispatch = useServerDispatch();

  const [isAddingToken, setIsAddingToken] = useState(false);

  const addToken = () => {
    setIsAddingToken(true);
    (async () => {
      const characterAddAction = characterAdd(await makeNewCharacter());
      const newCharacter = characterAddAction.payload;
      dispatch([
        characterAddAction,
        playerUpdateAddCharacterId({
          id: myself.id,
          characterId: newCharacter.id,
        }),
      ]);
      setNewCharacterIds((l) => [...l, newCharacter.id]);
    })().finally(() => setIsAddingToken(false));
  };

  return (
    <>
      <Button onClick={addToken} disabled={isAddingToken}>
        Add Character
      </Button>
      <TokenList
        newCharacterIds={newCharacterIds}
        setNewCharacterIds={setNewCharacterIds}
        characters={entries(characters).filter((t) =>
          myself.characterIds.includes(t.id)
        )}
      />

      {myself.isGM && <TemplateEditor />}

      {myself.isGM && (
        <GMArea>
          <h4>Other {"players'"} characters</h4>
          <div className="token-list">
            <TokenList
              newCharacterIds={newCharacterIds}
              setNewCharacterIds={setNewCharacterIds}
              characters={entries(characters).filter(
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
  const [newCharacterIds, setNewCharacterIds] = useState<RRCharacterID[]>([]);

  const dispatch = useServerDispatch();

  const [isAddingToken, setIsAddingToken] = useState(false);

  const addTemplate = () => {
    setIsAddingToken(true);
    (async () => {
      const characterAddAction = characterTemplateAdd(await makeNewCharacter());
      const newCharacter = characterAddAction.payload;
      dispatch(characterAddAction);
      setNewCharacterIds((l) => [...l, newCharacter.id]);
    })().finally(() => setIsAddingToken(false));
  };

  const characterTemplates = entries(
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
          newCharacterIds={newCharacterIds}
          setNewCharacterIds={setNewCharacterIds}
          characters={characterTemplates}
        />
      </div>
    </GMArea>
  );
}

function TokenList({
  characters,
  newCharacterIds,
  setNewCharacterIds,
  isTemplate,
}: {
  characters: RRCharacter[] | RRCharacterTemplate[];
  newCharacterIds: RRCharacterID[];
  setNewCharacterIds: React.Dispatch<React.SetStateAction<RRCharacterID[]>>;
  isTemplate?: boolean;
}) {
  return (
    <div className="token-list">
      {characters.map((character) => (
        <EditableCharacterPreview
          key={character.id}
          character={character}
          isTemplate={isTemplate}
          wasJustCreated={newCharacterIds.includes(character.id)}
          onNameFirstEdited={() =>
            setNewCharacterIds((l) => l.filter((id) => id !== character.id))
          }
        />
      ))}
    </div>
  );
}

function EditableCharacterPreview({
  character,
  onNameFirstEdited,
  wasJustCreated,
  isTemplate,
}: {
  character: RRCharacter;
  onNameFirstEdited: () => void;
  wasJustCreated: boolean;
  isTemplate?: boolean;
}) {
  const [, dragRef] = useDrag<{ id: RRCharacterID }, void, null>(() => ({
    type: isTemplate ? "tokenTemplate" : "token",
    item: { id: character.id },
  }));

  const [selected, setSelected] = useState(wasJustCreated);

  return (
    <Popover
      content={
        <CharacterEditor
          isTemplate={isTemplate}
          character={character}
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
        <p>{character.name}</p>
        <CharacterPreview character={character} />
      </div>
    </Popover>
  );
}
