import React, { useState, useCallback } from "react";
import {
  playerUpdateAddCharacterId,
  characterAdd,
  characterTemplateAdd,
  assetImageAdd,
} from "../../../shared/actions";
import {
  entries,
  RRCharacter,
  RRCharacterID,
  RRCharacterTemplate,
  RRFileImage,
  RRPlayerID,
} from "../../../shared/state";
import { generateRandomToken, uploadFiles } from "../../files";
import { useServerDispatch, useServerState } from "../../state";
import { useDrag, useDrop } from "react-dnd";
import { useMyself } from "../../myself";
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
  actionCreator: typeof characterAdd | typeof characterTemplateAdd,
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
    blurhash: image.blurhash,
    width: image.width,
    height: image.height,

    playerId: myId,
  });

  const addAction = actionCreator({
    auras: [],
    conditions: [],
    hp: 0,
    maxHP: 0,
    temporaryHP: 0,
    maxHPAdjustment: 0,
    scale: 1,
    visibility: "everyone",
    attributes: {},
    stats: {},
    name: await randomName(),
    tokenImageAssetId: assetImageAddAction.payload.id,
    tokenBorderColor: randomColor(),
    localToMap: null,
  });

  return {
    id: addAction.payload.id,
    actions: [assetImageAddAction, addAction],
  };
}

export const CharacterManager = React.memo(function CharacterManager() {
  const myself = useMyself();
  const characters = useServerState((s) => s.characters);
  const [newCharacterIds, setNewCharacterIds] = useState<RRCharacterID[]>([]);

  const dispatch = useServerDispatch();

  const [isAddingToken, setIsAddingToken] = useState(false);

  const addCharacter = useCallback(
    async (tokenImage?: RRFileImage) => {
      setIsAddingToken(true);
      try {
        const { id: newCharacterId, actions } = await makeNewCharacter(
          characterAdd,
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
        characters={entries(characters).filter((t) =>
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
            characters={entries(characters).filter(
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
  const myself = useMyself();

  const dispatch = useServerDispatch();

  const [isAddingToken, setIsAddingToken] = useState(false);

  const addTemplate = async (tokenImage?: RRFileImage) => {
    setIsAddingToken(true);
    try {
      const { id: newCharacterId, actions } = await makeNewCharacter(
        characterTemplateAdd,
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
    useServerState((state) => state.characterTemplates)
  );

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
  characters: RRCharacter[] | RRCharacterTemplate[];
  newCharacterIds: RRCharacterID[];
  setNewCharacterIds: React.Dispatch<React.SetStateAction<RRCharacterID[]>>;
  isTemplate?: boolean;
  addCharacter: ((tokenImage?: RRFileImage) => void) | false;
}) {
  const [dropProps, dropRef] = useDrop<
    { files: File[] },
    void,
    { nativeFileHovered: boolean }
  >(() => ({
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
  }));

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
          onNameFirstEdited={() =>
            setNewCharacterIds((l) => l.filter((id) => id !== character.id))
          }
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
});
