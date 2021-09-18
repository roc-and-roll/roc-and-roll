import clsx from "clsx";
import React, { useEffect, useState } from "react";
import { RRCharacter } from "../../../shared/state";
import {
  clamp,
  isCharacterHurt,
  isCharacterUnconsciousOrDead,
  isCharacterOverhealed,
} from "../../../shared/util";
import { tokenImageUrl } from "../../files";
import { BlurhashImage } from "../blurhash/BlurhashImage";

export function CharacterPreview({ character }: { character: RRCharacter }) {
  const hurt = isCharacterHurt(character);
  const unconsciousOrDead = isCharacterUnconsciousOrDead(character);
  const overhealed = isCharacterOverhealed(character);

  return (
    <BlurhashImage
      image={{
        blurhash: character.tokenImage.blurhash,
        url: tokenImageUrl(character, 32),
      }}
      width={32}
      height={32}
      loading="lazy"
      className={clsx("token-image", {
        hurt,
        unconsciousOrDead,
        overhealed,
      })}
      title={character.name}
    />
  );
}

export function CharacterStack({ characters }: { characters: RRCharacter[] }) {
  const [topIdx, setTopIdx] = useState(0);

  // Allow to click through all characters
  const sortedCharacters = [
    ...characters.slice(topIdx),
    ...characters.slice(0, topIdx),
  ];
  useEffect(() => {
    setTopIdx((old) => clamp(0, old, characters.length - 1));
  }, [characters.length]);

  return (
    <div
      className="token-stack"
      onClick={() =>
        setTopIdx((old) => (old === 0 ? characters.length - 1 : old - 1))
      }
    >
      {sortedCharacters.map((character, i) => (
        <div
          key={character.id}
          style={{
            left:
              characters.length === 1
                ? 24 / 2 // center token if there is just one in the stack
                : i === 0
                ? 0 // avoid division by 0
                : i * (24 / (characters.length - 1)),
          }}
        >
          <CharacterPreview character={character} />
        </div>
      ))}
    </div>
  );
}
