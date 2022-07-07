import React, { useState, useCallback } from "react";
import {
  playerUpdateAddCharacterId,
  characterAdd,
  assetImageAdd,
} from "../../../shared/actions";
import {
  entries,
  RRCharacter,
  RRCharacterID,
  RRFileImage,
  RRPlayerID,
} from "../../../shared/state";
import { generateRandomToken, uploadFiles } from "../../files";
import { useServerDispatch, useServerState } from "../../state";
import { useDrag, useDrop } from "react-dnd";
import { useMyProps } from "../../myself";
import { GMArea } from "../GMArea";
import { Popover } from "../Popover";
import { Button } from "../ui/Button";
import { randomName } from "../../../shared/util";
import { CharacterEditor } from "./CharacterEditor";
import { CharacterPreview } from "./CharacterPreview";
import { randomColor } from "../../../shared/colors";
import { NativeTypes } from "react-dnd-html5-backend";
import { DropIndicator } from "../DropIndicator";

async function makeNewCharacter(
  isTemplate: boolean,
  myId: RRPlayerID,
  tokenImage?: RRFileImage
) {
  const image = tokenImage ?? (await generateRandomToken());
  const assetImageAddAction = assetImageAdd({
    name: image.originalFilename,
    description: null,
    tags: [],
    extra: {},

    location: {
      type: "local",
      filename: image.filename,
      originalFilename: image.originalFilename,
      mimeType: image.mimeType,
    },

    type: "image",
    originalFunction: "token",
    blurHash: image.blurHash,
    width: image.width,
    height: image.height,
    dpi: null,

    playerId: myId,
  });

  const addAction = characterAdd({
    auras: [],
    conditions: [],
    hp: 0,
    maxHP: 0,
    temporaryHP: 0,
    maxHPAdjustment: 0,
    ac: null,
    spellSaveDC: null,
    scale: 1,
    visibility: "everyone",
    limitedUseSkills: [],
    attributes: {
      initiative: null,
      proficiency: null,
    },
    stats: {
      STR: null,
      DEX: null,
      CON: null,
      INT: null,
      WIS: null,
      CHA: null,
    },
    savingThrows: {
      STR: null,
      DEX: null,
      CON: null,
      INT: null,
      WIS: null,
      CHA: null,
    },
    skills: {
      Athletics: null,
      Acrobatics: null,
      "Sleight of Hand": null,
      Stealth: null,
      Arcana: null,
      History: null,
      Investigation: null,
      Nature: null,
      Religion: null,
      "Animal Handling": null,
      Insight: null,
      Medicine: null,
      Perception: null,
      Survival: null,
      Deception: null,
      Intimidation: null,
      Performance: null,
      Persuasion: null,
    },
    name: await randomName(),
    tokenImageAssetId: assetImageAddAction.payload.id,
    tokenBorderColor: randomColor(),
    localToMap: null,
    isTemplate,
    diceTemplateCategories: [],
    notes: "",
    spells: [],
  });

  return {
    id: addAction.payload.id,
    actions: [assetImageAddAction, addAction],
  };
}

export const CharacterManager = React.memo(function CharacterManager() {
  const myself = useMyProps("id", "isGM", "characterIds");
  const allCharacters = useServerState((s) => s.characters);
  const characters = entries(allCharacters).filter((s) => !s.isTemplate);
  const [newCharacterIds, setNewCharacterIds] = useState<RRCharacterID[]>([]);

  const dispatch = useServerDispatch();

  const [isAddingToken, setIsAddingToken] = useState(false);

  const addCharacter = useCallback(
    async (tokenImage?: RRFileImage) => {
      setIsAddingToken(true);
      try {
        const { id: newCharacterId, actions } = await makeNewCharacter(
          false,
          myself.id,
          tokenImage
        );
        dispatch([
          ...actions,
          playerUpdateAddCharacterId({
            id: myself.id,
            characterId: newCharacterId,
          }),
        ]);
        setNewCharacterIds((l) => [...l, newCharacterId]);
      } finally {
        setIsAddingToken(false);
      }
    },
    [dispatch, myself.id]
  );

  return (
    <>
      <Button onClick={() => addCharacter()} disabled={isAddingToken}>
        Add Character
      </Button>
      <CharacterList
        newCharacterIds={newCharacterIds}
        setNewCharacterIds={setNewCharacterIds}
        characters={characters.filter((t) =>
          myself.characterIds.includes(t.id)
        )}
        addCharacter={addCharacter}
      />

      {myself.isGM && <TemplateEditor />}

      {myself.isGM && (
        <GMArea>
          <h4>Other {"players'"} characters</h4>
          <CharacterList
            newCharacterIds={newCharacterIds}
            setNewCharacterIds={setNewCharacterIds}
            characters={characters.filter(
              (t) => !myself.characterIds.includes(t.id) && !t.localToMap
            )}
            addCharacter={false}
          />
        </GMArea>
      )}
    </>
  );
});

const TemplateEditor = React.memo(function TemplateEditor() {
  const [newCharacterIds, setNewCharacterIds] = useState<RRCharacterID[]>([]);
  const myself = useMyProps("id");

  const dispatch = useServerDispatch();

  const [isAddingToken, setIsAddingToken] = useState(false);

  const addTemplate = async (tokenImage?: RRFileImage) => {
    setIsAddingToken(true);
    try {
      const { id: newCharacterId, actions } = await makeNewCharacter(
        true,
        myself.id,
        tokenImage
      );
      dispatch(actions);
      setNewCharacterIds((l) => [...l, newCharacterId]);
    } finally {
      setIsAddingToken(false);
    }
  };

  const characterTemplates = entries(
    useServerState((state) => state.characters)
  ).filter((t) => t.isTemplate);

  return (
    <GMArea>
      <div className="clearfix">
        <Button
          style={{ float: "right" }}
          onClick={() => addTemplate()}
          disabled={isAddingToken}
        >
          Add
        </Button>
        <h4>Character Templates</h4>
        <CharacterList
          isTemplate={true}
          newCharacterIds={newCharacterIds}
          setNewCharacterIds={setNewCharacterIds}
          characters={characterTemplates}
          addCharacter={addTemplate}
        />
      </div>
    </GMArea>
  );
});

function CharacterList({
  characters,
  newCharacterIds,
  setNewCharacterIds,
  isTemplate,
  addCharacter,
}: {
  characters: RRCharacter[];
  newCharacterIds: RRCharacterID[];
  setNewCharacterIds: React.Dispatch<React.SetStateAction<RRCharacterID[]>>;
  isTemplate?: boolean;
  addCharacter: ((tokenImage?: RRFileImage) => void) | false;
}) {
  const [dropProps, dropRef] = useDrop<
    { files: File[] },
    void,
    { nativeFileHovered: boolean }
  >(
    () => ({
      accept: addCharacter ? [NativeTypes.FILE] : [],
      drop: (item) => {
        void (async () => {
          if (addCharacter !== false) {
            const uploadedFiles = await uploadFiles(item.files, "image");
            uploadedFiles.forEach((uploadedFile) => {
              addCharacter(uploadedFile);
            });
          }
        })();
      },
      collect: (monitor) => ({
        nativeFileHovered:
          monitor.canDrop() && monitor.getItemType() === NativeTypes.FILE,
      }),
    }),
    [addCharacter]
  );

  const onNameFirstEdited = useCallback(
    (characterId: RRCharacterID) => {
      setNewCharacterIds((newCharacterIds) =>
        newCharacterIds.filter((id) => id !== characterId)
      );
    },
    [setNewCharacterIds]
  );

  return (
    <div className="token-list" ref={dropRef}>
      {dropProps.nativeFileHovered && (
        <DropIndicator>
          <p>create new character{isTemplate && " template"}</p>
        </DropIndicator>
      )}
      {characters.map((character) => (
        <EditableCharacterPreview
          key={character.id}
          character={character}
          isTemplate={isTemplate}
          wasJustCreated={newCharacterIds.includes(character.id)}
          onNameFirstEdited={onNameFirstEdited}
        />
      ))}
    </div>
  );
}

const EditableCharacterPreview = React.memo(function EditableCharacterPreview({
  character,
  onNameFirstEdited,
  wasJustCreated,
  isTemplate,
}: {
  character: RRCharacter;
  onNameFirstEdited: (characterId: RRCharacterID) => void;
  wasJustCreated: boolean;
  isTemplate?: boolean;
}) {
  const [, dragRef] = useDrag<{ id: RRCharacterID }, void, null>(
    () => ({
      type: isTemplate ? "tokenTemplate" : "token",
      item: { id: character.id },
    }),
    [isTemplate, character.id]
  );

  const [selected, setSelected] = useState(wasJustCreated);

  return (
    <Popover
      content={
        <CharacterEditor
          character={character}
          wasJustCreated={wasJustCreated}
          onNameFirstEdited={() => onNameFirstEdited(character.id)}
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
});
