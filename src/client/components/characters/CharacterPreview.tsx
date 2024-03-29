import { faTimes } from "@fortawesome/free-solid-svg-icons";
import clsx from "clsx";
import React, { useEffect, useState } from "react";
import { RRCharacter } from "../../../shared/state";
import {
  clamp,
  isCharacterHurt,
  isCharacterUnconscious,
  isCharacterOverHealed,
  isCharacterDead,
} from "../../../shared/util";
import { tokenImageUrl } from "../../files";
import { useServerState } from "../../state";
import { BlurHashImage } from "../blurHash/BlurHashImage";
import { RRFontAwesomeIcon } from "../RRFontAwesomeIcon";

const DEFAULT_CHARACTER_SIZE = 32;

// eslint-disable-next-line react/display-name
export const CharacterPreview = React.memo(
  React.forwardRef<
    HTMLSpanElement,
    {
      character: Pick<
        RRCharacter,
        | "name"
        | "temporaryHP"
        | "hp"
        | "maxHP"
        | "maxHPAdjustment"
        | "conditions"
        | "tokenImageAssetId"
        | "tokenBorderColor"
      >;
      title?: string;
      size?: number;
      shouldDisplayShadow?: boolean;
    }
  >(function CharacterPreview(
    { character, title, size, shouldDisplayShadow = true },
    ref
  ) {
    const hurt = isCharacterHurt(character);
    const dead = isCharacterDead(character);
    const unconscious = isCharacterUnconscious(character);
    const overHealed = isCharacterOverHealed(character);

    const asset = useServerState(
      (state) => state.assets.entities[character.tokenImageAssetId]
    );

    if (asset?.type !== "image") {
      return null;
    }

    const currentSize = size ?? DEFAULT_CHARACTER_SIZE;
    return (
      <span className="character-image" ref={ref}>
        <BlurHashImage
          image={{
            blurHash: asset.blurHash,
            url: tokenImageUrl(character, asset, currentSize),
          }}
          className={clsx(
            shouldDisplayShadow && { hurt, unconscious, overHealed, dead }
          )}
          width={currentSize}
          height={currentSize}
          loading="lazy"
          style={{
            width: currentSize,
            height: currentSize,
            borderRadius: currentSize,
            filter: dead ? "grayscale(100%)" : undefined,
          }}
          title={title ?? character.name}
        />
        {dead && shouldDisplayShadow && (
          <RRFontAwesomeIcon
            icon={faTimes}
            className="absolute top-0 left-0 text-red-800"
            style={{
              width: currentSize,
              height: currentSize,
            }}
          />
        )}
      </span>
    );
  })
);

const STACK_FAN_OUT_SIZE = 32;

export function CharacterStack({
  characters,
  size,
}: {
  characters: RRCharacter[];
  size?: number;
}) {
  const [topIdx, setTopIdx] = useState(0);

  // Allow to click through all characters
  const sortedCharacters = [
    ...characters.slice(topIdx),
    ...characters.slice(0, topIdx),
  ];
  useEffect(() => {
    setTopIdx((old) => clamp(0, old, characters.length - 1));
  }, [characters.length]);

  size ??= DEFAULT_CHARACTER_SIZE;
  const fanOutSize =
    (size / DEFAULT_CHARACTER_SIZE) *
    Math.min(STACK_FAN_OUT_SIZE, characters.length * 4);
  return (
    <div
      className="relative select-none"
      style={{
        width: size + (characters.length > 1 ? fanOutSize : 0),
        height: size,
      }}
      onClick={() =>
        setTopIdx((old) => (old === 0 ? characters.length - 1 : old - 1))
      }
    >
      {sortedCharacters.map((character, i) => (
        <div
          key={character.id}
          className="absolute"
          style={{
            left:
              characters.length === 1 || i === 0
                ? 0 // avoid division by 0
                : i * (fanOutSize / (characters.length - 1)),
          }}
        >
          <CharacterPreview character={character} size={size} />
        </div>
      ))}
    </div>
  );
}
