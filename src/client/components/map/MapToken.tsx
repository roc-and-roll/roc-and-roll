import React, { useCallback } from "react";
import { GRID_SIZE } from "../../../shared/constants";
import {
  RRAura,
  RRMapObject,
  RRPlayer,
  RRToken,
  RRTokenID,
  RRTokenOnMap,
} from "../../../shared/state";
import { tokenImageUrl } from "../../files";
import { canControlToken } from "../../permissions";
import { RoughRectangle, RoughText, RoughCircle } from "../rough";
import tinycolor from "tinycolor2";
import { assertNever, clamp } from "../../../shared/util";
import { useMyself } from "../../myself";
import ReactDOM from "react-dom";
import { HPInlineEdit } from "./HPInlineEdit";

export const MapToken = React.memo<{
  token: RRToken;
  object: RRTokenOnMap;
  zoom: number;
  selected: boolean;
  onStartMove: (o: RRMapObject, e: React.MouseEvent) => void;
  contrastColor: string;
  auraArea: SVGGElement | null;
  healthbarArea: SVGGElement | null;
  onSetHP: (tokenId: RRTokenID, hp: number) => void;
  canStartMoving: boolean;
}>(function MapToken({
  token,
  object,
  selected,
  onStartMove,
  zoom,
  contrastColor,
  auraArea,
  healthbarArea,
  canStartMoving,
  onSetHP,
}) {
  const {
    position: { x, y },
  } = object;
  const myself = useMyself();
  const handleMouseDown = (e: React.MouseEvent) => {
    onStartMove(object, e);
  };
  const setHP = useCallback(
    (hp: number) => {
      onSetHP(token.id, hp);
    },
    [onSetHP, token.id]
  );

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
      {selected && (
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
  token: RRToken;
  aura: RRAura;
  myself: RRPlayer;
}) {
  if (
    (aura.visibility === "playerOnly" && !myself.tokenIds.includes(token.id)) ||
    (aura.visibility === "playerAndGM" &&
      !myself.isGM &&
      !myself.tokenIds.includes(token.id))
  ) {
    return null;
  }

  const tokenSize = GRID_SIZE * token.scale;

  const size = (aura.size * GRID_SIZE) / 5 + tokenSize / 2;
  const sharedProps = {
    x: x - size + tokenSize / 2,
    y: y - size + tokenSize / 2,
    fill: tinycolor(aura.color).setAlpha(0.3).toRgbString(),
    fillStyle: "solid",
  };
  if (aura.shape === "circle") {
    return <RoughCircle {...sharedProps} d={size * 2} roughness={1} />;
  } else if (aura.shape === "square") {
    return (
      <RoughRectangle
        {...sharedProps}
        h={size * 2}
        w={size * 2}
        roughness={3}
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
  token: RRToken;
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
