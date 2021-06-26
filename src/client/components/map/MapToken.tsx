import React, { useCallback, useRef, useState } from "react";
import { GRID_SIZE } from "../../../shared/constants";
import {
  RRAura,
  RRMapObject,
  RRPlayer,
  RRCharacter,
  RRCharacterID,
  RRToken,
  RRPoint,
  RRMapID,
} from "../../../shared/state";
import { tokenImageUrl } from "../../files";
import { canControlToken, canViewTokenOnMap } from "../../permissions";
import { RoughRectangle, RoughText } from "../rough";
import tinycolor from "tinycolor2";
import { assertNever, clamp, isCharacterHurt } from "../../../shared/util";
import { useMyself } from "../../myself";
import ReactDOM from "react-dom";
import { HPInlineEdit } from "./HPInlineEdit";
import { useRecoilValue } from "recoil";
import { hoveredMapObjectsFamily } from "./Map";
import {
  highlightedCharactersFamily,
  selectedMapObjectsFamily,
  tokenFamily,
} from "./MapContainer";
import { Popover } from "../Popover";
import { TokenEditor, conditionIcons } from "../tokens/TokenEditor";
import { makePoint, pointAdd, pointEquals } from "../../../shared/point";
import { EmanationArea } from "./Areas";
import { useServerDispatch } from "../../state";
import { mapObjectUpdate } from "../../../shared/actions";
import { DebouncedIntegerInput } from "../ui/TextInput";

export const MapToken = React.memo<{
  mapId: RRMapID;
  object: RRToken;
  canStartMoving: boolean;
  onStartMove: (o: RRMapObject, e: React.MouseEvent) => void;
  auraArea: SVGGElement | null;
  healthbarArea: SVGGElement | null;
  zoom: number;
  contrastColor: string;
  smartSetTotalHP: (tokenId: RRCharacterID, hp: number) => void;
}>(function MapToken({
  mapId,
  object,
  canStartMoving,
  onStartMove,
  auraArea,
  healthbarArea,
  zoom,
  contrastColor,
  smartSetTotalHP,
}) {
  const myself = useMyself();
  const token = useRecoilValue(tokenFamily(object.characterId));

  const isHovered = useRecoilValue(hoveredMapObjectsFamily(object.id));
  const isSelected = useRecoilValue(selectedMapObjectsFamily(object.id));
  const isHighlighted = useRecoilValue(
    highlightedCharactersFamily(object.characterId)
  );
  const isSelectedOrHovered = isHovered || isSelected;

  const [editorVisible, setEditorVisible] = useState(false);
  const firstMouseDownPos = useRef<RRPoint>();

  const setHP = useCallback(
    (hp: number) => {
      token?.id && smartSetTotalHP(token.id, hp);
    },
    [smartSetTotalHP, token?.id]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    onStartMove(object, e);
    firstMouseDownPos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (
      e.button === 2 &&
      firstMouseDownPos.current &&
      pointEquals(firstMouseDownPos.current, { x: e.clientX, y: e.clientY })
    ) {
      setEditorVisible(true);
    }
  };

  if (!token || !canViewTokenOnMap(token, myself)) {
    return null;
  }

  const {
    position: { x, y },
  } = object;

  const canControl = canStartMoving && canControlToken(token, myself);
  const tokenStyle = {
    ...(isCharacterHurt(token) ? { filter: "url(#tokenHurtShadow)" } : {}),
    ...(canControl ? { cursor: "move" } : {}),
  };

  const tokenSize = GRID_SIZE * token.scale;
  const tokenRepresentation = token.tokenImage ? (
    <image
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      x={x}
      y={y}
      style={tokenStyle}
      width={tokenSize}
      height={tokenSize}
      href={tokenImageUrl(
        {
          tokenImage: token.tokenImage,
          tokenBorderColor: token.tokenBorderColor,
        },
        tokenSize * zoom
      )}
    />
  ) : (
    <circle
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      cx={x + tokenSize / 2}
      cy={y + tokenSize / 2}
      r={tokenSize / 2}
      fill="red"
      style={tokenStyle}
    />
  );

  const center = pointAdd(object.position, makePoint(tokenSize / 2));

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
        ReactDOM.createPortal(
          <>
            {canControl && token.maxHP > 0 && (
              <g transform={`translate(${x},${y - 16})`}>
                <Healthbar
                  token={token}
                  setHP={setHP}
                  contrastColor={contrastColor}
                />
              </g>
            )}
            {isHighlighted && (
              <RoughRectangle
                x={x}
                y={y}
                w={tokenSize}
                h={tokenSize}
                stroke="orange"
                fill="none"
              />
            )}
            {token.conditions.map((condition, index) => (
              <image
                key={condition}
                // TODO: Normally, we'd want to disable pointer events on
                // condition icons, so that clicking on them will still allow
                // you to select and move your token. However, this causes the
                // <title> not to show when hovering the condition icon.
                //
                // pointerEvents="none"
                className="token-condition-icon"
                x={object.position.x + (index % 4) * 16}
                y={object.position.y + Math.floor(index / 4) * 16}
                href={conditionIcons[condition]}
              >
                <title>{condition}</title>
              </image>
            ))}
          </>,
          healthbarArea
        )}

      <Popover
        content={
          <div onMouseDown={(e) => e.stopPropagation()}>
            <TokenEditor
              isTemplate={false}
              token={token}
              wasJustCreated={false}
              onNameFirstEdited={() => {}}
              onClose={() => setEditorVisible(false)}
            />
            <MapTokenEditor mapId={mapId} token={object} />
          </div>
        }
        visible={editorVisible}
        onClickOutside={() => setEditorVisible(false)}
        interactive
        placement="right"
      >
        <g>
          {object.rotation === 0 ? (
            tokenRepresentation
          ) : (
            <g
              transform={`rotate(${object.rotation}, ${center.x}, ${center.y})`}
            >
              {tokenRepresentation}
            </g>
          )}
          {isSelectedOrHovered && (
            <circle
              // do not block pointer events
              pointerEvents="none"
              cx={center.x}
              cy={center.y}
              r={tokenSize / 2 - 2}
              fill="transparent"
              stroke={contrastColor}
              className="selection-area-highlight"
            />
          )}
          {token.visibility !== "everyone" && (
            <>
              <title>only visible to GMs</title>
              <RoughText
                // do not block pointer events
                pointerEvents="none"
                x={center.x}
                y={center.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="red"
                stroke="black"
                strokeWidth={5}
                paintOrder="stroke"
                fontSize={`calc(1.2rem * ${tokenSize / GRID_SIZE})`}
                fontWeight="bold"
                transform={`rotate(-30, ${center.x}, ${center.y})`}
                style={{
                  letterSpacing: ".3rem",
                }}
              >
                HIDDEN
              </RoughText>
            </>
          )}
        </g>
      </Popover>
    </>
  );
});

function MapTokenEditor({ mapId, token }: { mapId: RRMapID; token: RRToken }) {
  const dispatch = useServerDispatch();

  return (
    <>
      <hr />
      <h3>Map Token Settings</h3>
      <label>
        Rotation:{" "}
        <DebouncedIntegerInput
          min={-360}
          max={360}
          value={token.rotation}
          onChange={(rotation) =>
            dispatch({
              actions: [
                mapObjectUpdate(mapId, { id: token.id, changes: { rotation } }),
              ],
              optimisticKey: "rotation",
            })
          }
        />
      </label>
    </>
  );
}

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
  switch (aura.shape) {
    case "circle":
      return (
        <>
          <circle
            cx={x + tokenSize / 2}
            cy={y + tokenSize / 2}
            fill={tinycolor(fill).setAlpha(0.15).toRgbString()}
            r={size}
          />
          <EmanationArea
            r={Math.round(aura.size / 5)}
            creatureX={x / GRID_SIZE}
            creatureY={y / GRID_SIZE}
            creatureW={token.scale}
            creatureH={token.scale}
            fill={fill}
          />
        </>
      );
    case "square":
      return (
        <rect
          x={x - size + tokenSize / 2}
          y={y - size + tokenSize / 2}
          fill={fill}
          height={size * 2}
          width={size * 2}
        />
      );
    default:
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

  const adjustedMaxHP = token.maxHP + token.maxHPAdjustment;
  const totalMaxHP = adjustedMaxHP + token.temporaryHP;

  const hpColor = "#c5d87c";
  const temporaryHPColor = "#67ac19";

  const hpBarWidth =
    tokenSize *
    clamp(0, token.hp / adjustedMaxHP, 1) *
    (adjustedMaxHP / totalMaxHP);

  const temporaryHPBarWidth = tokenSize * (token.temporaryHP / totalMaxHP);

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
      {token.maxHP > 0 && (
        <>
          <RoughRectangle
            x={0}
            y={0}
            w={hpBarWidth}
            h={16}
            stroke="transparent"
            fill={hpColor}
            fillStyle="solid"
            roughness={0}
          />
          {token.temporaryHP > 0 && temporaryHPBarWidth > 0 && (
            <RoughRectangle
              x={hpBarWidth}
              y={0}
              w={temporaryHPBarWidth}
              h={16}
              stroke="transparent"
              fill={temporaryHPColor}
              fillStyle="solid"
              roughness={0}
            />
          )}
        </>
      )}
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
        <HPInlineEdit hp={token.hp + token.temporaryHP} setHP={setHP} />
      </foreignObject>
      <RoughText
        x={tokenSize / 2 - 3}
        y={-1}
        width={tokenSize}
        fontWeight="bold"
        fontSize={14}
        style={{ cursor: "default" }}
      >
        /&thinsp;{totalMaxHP}
      </RoughText>
    </>
  );
}
