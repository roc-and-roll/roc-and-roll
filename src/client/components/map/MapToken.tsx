import React from "react";
import { GRID_SIZE } from "../../../shared/constants";
import { RRToken } from "../../../shared/state";
import { tokenImageUrl } from "../../files";
import { canControlToken } from "../../permissions";
import { RoughRectangle, RoughText, RoughCircle } from "../rough";
import tinycolor from "tinycolor2";
import { assertNever, clamp } from "../../../shared/util";
import { useMyself } from "../../myself";
import ReactDOM from "react-dom";
import { HPInlineEdit } from "./HPInlineEdit";

export function MapToken({
  token,
  x,
  y,
  selected,
  onStartMove,
  zoom,
  contrastColor,
  auraArea,
  healthbarArea,
  canStartMoving,
  setHP,
}: {
  token: RRToken;
  x: number;
  y: number;
  zoom: number;
  selected: boolean;
  onStartMove: (e: React.MouseEvent) => void;
  contrastColor: string;
  auraArea: SVGGElement | null;
  healthbarArea: SVGGElement | null;
  setHP: (hp: number) => void;
  canStartMoving: boolean;
}) {
  const myself = useMyself();
  const handleMouseDown = (e: React.MouseEvent) => {
    onStartMove(e);
  };

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
            if (
              (aura.visibility === "playerOnly" &&
                !myself.tokenIds.includes(token.id)) ||
              (aura.visibility === "playerAndGM" &&
                !myself.isGM &&
                !myself.tokenIds.includes(token.id))
            ) {
              return null;
            }

            const size = (aura.size * GRID_SIZE) / 5 + tokenSize / 2;
            const sharedProps = {
              key: i,
              x: x - size + tokenSize / 2,
              y: y - size + tokenSize / 2,
              fill: tinycolor(aura.color).setAlpha(0.3).toRgbString(),
              fillStyle: "solid",
            };
            if (aura.shape === "circle") {
              return (
                <RoughCircle {...sharedProps} d={size * 2} roughness={1} />
              );
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
          }),
          auraArea
        )}
      {healthbarArea &&
        canControl &&
        ReactDOM.createPortal(
          <g transform={`translate(${x},${y - 16})`}>
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
}
