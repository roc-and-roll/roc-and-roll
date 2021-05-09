import React, { useCallback } from "react";
import { GRID_SIZE } from "../../../shared/constants";
import {
  RRAura,
  RRMapObject,
  RRPlayer,
  RRCharacter,
  RRCharacterID,
  RRToken,
} from "../../../shared/state";
import { tokenImageUrl } from "../../files";
import { canControlToken, canViewTokenOnMap } from "../../permissions";
import { RoughRectangle, RoughText } from "../rough";
import tinycolor from "tinycolor2";
import { assertNever, clamp } from "../../../shared/util";
import { useMyself } from "../../myself";
import ReactDOM from "react-dom";
import { HPInlineEdit } from "./HPInlineEdit";
import { useRecoilValue } from "recoil";
import { hoveredMapObjectsFamily } from "./Map";
import { selectedMapObjectsFamily, tokenFamily } from "./MapContainer";

export const MapToken = React.memo<{
  object: RRToken;
  canStartMoving: boolean;
  onStartMove: (o: RRMapObject, e: React.MouseEvent) => void;
  auraArea: SVGGElement | null;
  healthbarArea: SVGGElement | null;
  zoom: number;
  contrastColor: string;
  setHP: (tokenId: RRCharacterID, hp: number) => void;
}>(function MapToken({
  object,
  canStartMoving,
  onStartMove,
  auraArea,
  healthbarArea,
  zoom,
  contrastColor,
  setHP: _setHP,
}) {
  const myself = useMyself();
  const token = useRecoilValue(tokenFamily(object.characterId));

  const isHovered = useRecoilValue(hoveredMapObjectsFamily(object.id));
  const isSelected = useRecoilValue(selectedMapObjectsFamily(object.id));
  const isSelectedOrHovered = isHovered || isSelected;

  const setHP = useCallback(
    (hp: number) => {
      token?.id && _setHP(token.id, hp);
    },
    [_setHP, token?.id]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    onStartMove(object, e);
  };

  if (!token || !canViewTokenOnMap(token, myself)) {
    return null;
  }

  const {
    position: { x, y },
  } = object;

  const canControl = canStartMoving && canControlToken(token, myself);
  const tokenStyle = canControl ? { cursor: "move" } : {};

  const tokenSize = GRID_SIZE * token.scale;
  return (
    <>
      {auraArea &&
        // we need to render the auras as the very first thing in the SVG so
        // that they are located in the background and still allow users to
        // interact with objects that would otherwise be beneath the auras
        ReactDOM.createPortal(
          token.auras.map((aura, i) => {
            return (
              <Aura
                key={i}
                token={token}
                aura={aura}
                myself={myself}
                x={x}
                y={y}
              />
            );
          }),
          auraArea
        )}
      {healthbarArea &&
        canControl &&
        ReactDOM.createPortal(
          <g transform={`translate(${x},${y - 16})`}>
            <Healthbar
              token={token}
              setHP={setHP}
              contrastColor={contrastColor}
            />
          </g>,
          healthbarArea
        )}
      {token.image ? (
        <image
          onMouseDown={handleMouseDown}
          x={x}
          y={y}
          style={tokenStyle}
          width={tokenSize}
          height={tokenSize}
          href={tokenImageUrl(token.image, tokenSize, Math.ceil(zoom))}
        />
      ) : (
        <circle
          onMouseDown={handleMouseDown}
          cx={x + tokenSize / 2}
          cy={y + tokenSize / 2}
          r={tokenSize / 2}
          fill="red"
          style={tokenStyle}
        />
      )}
      {isSelectedOrHovered && (
        <circle
          onMouseDown={handleMouseDown}
          cx={x + tokenSize / 2}
          cy={y + tokenSize / 2}
          r={tokenSize / 2 - 2}
          fill="transparent"
          className="selection-area-highlight"
          style={tokenStyle}
        />
      )}
    </>
  );
});

function Aura({
  x,
  y,
  token,
  aura,
  myself,
}: {
  x: number;
  y: number;
  token: RRCharacter;
  aura: RRAura;
  myself: RRPlayer;
}) {
  if (
    (aura.visibility === "playerOnly" &&
      !myself.characterIds.includes(token.id)) ||
    (aura.visibility === "playerAndGM" &&
      !myself.isGM &&
      !myself.characterIds.includes(token.id))
  ) {
    return null;
  }

  const tokenSize = GRID_SIZE * token.scale;

  const size = (aura.size * GRID_SIZE) / 5 + tokenSize / 2;
  const fill = tinycolor(aura.color).setAlpha(0.3).toRgbString();
  if (aura.shape === "circle") {
    return (
      <circle
        cx={x + tokenSize / 2}
        cy={y + tokenSize / 2}
        fill={fill}
        r={size}
      />
    );
  } else if (aura.shape === "square") {
    return (
      <rect
        x={x - size + tokenSize / 2}
        y={y - size + tokenSize / 2}
        fill={fill}
        height={size * 2}
        width={size * 2}
      />
    );
  } else {
    assertNever(aura.shape);
  }
}

function Healthbar({
  token,
  contrastColor,
  setHP,
}: {
  token: RRCharacter;
  contrastColor: string;
  setHP: (hp: number) => void;
}) {
  const tokenSize = GRID_SIZE * token.scale;

  return (
    <>
      <RoughRectangle
        x={0}
        y={0}
        w={tokenSize}
        h={16}
        stroke="transparent"
        fill="white"
        fillStyle="solid"
        roughness={1}
      />
      <RoughRectangle
        x={0}
        y={0}
        w={tokenSize * clamp(0, token.hp / token.maxHP, 1)}
        h={16}
        stroke="transparent"
        fill="#c5d87c"
        fillStyle="solid"
        roughness={1}
      />
      <RoughRectangle
        x={0}
        y={0}
        w={tokenSize}
        h={16}
        stroke={tinycolor(contrastColor).setAlpha(0.5).toRgbString()}
        fill="transparent"
        roughness={1}
      />
      {/*
          Uncomment this text when making changes to font sizes or text
          contents, so that you can re-align the hp and max hp to be perfectly
          centered.
          <RoughText
            x={tokenSize / 2}
            y={-1}
            width={tokenSize}
            textAnchor="middle"
            fontWeight="bold"
            fontSize={14}
          >
            {token.hp}&thinsp;/&thinsp;{token.maxHP}
          </RoughText>
        */}
      <foreignObject x={0} y={2} width={tokenSize / 2 - 4} height={14}>
        <HPInlineEdit hp={token.hp} setHP={setHP} />
      </foreignObject>
      <RoughText
        x={tokenSize / 2 - 3}
        y={-1}
        width={tokenSize}
        fontWeight="bold"
        fontSize={14}
        style={{ cursor: "default" }}
      >
        /&thinsp;{token.maxHP}
      </RoughText>
    </>
  );
}
