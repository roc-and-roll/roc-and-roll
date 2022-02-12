import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
  GRID_SIZE,
} from "../../../shared/constants";
import {
  RRAura,
  RRMapObject,
  RRPlayer,
  RRCharacter,
  RRCharacterID,
  RRToken,
  RRPoint,
  RRMapID,
  RRColor,
} from "../../../shared/state";
import { tokenImageUrl } from "../../files";
import { canControlToken, canViewTokenOnMap } from "../../permissions";
import { RoughLine, RoughRectangle, RoughText } from "../rough";
import tinycolor from "tinycolor2";
import {
  assertNever,
  isCharacterDead,
  isCharacterHurt,
  isCharacterUnconscious,
  isCharacterOverHealed,
} from "../../../shared/util";
import { useMyProps } from "../../myself";
import { useRecoilState, useRecoilValue } from "recoil";
import { CURSOR_POSITION_SYNC_DEBOUNCE, hoveredMapObjectsFamily } from "./Map";
import {
  highlightedCharactersFamily,
  selectedMapObjectsFamily,
  characterFamily,
  assetFamily,
  mapObjectGhostPositionsFamily,
} from "./recoil";
import { Popover } from "../Popover";
import { CharacterEditor, conditionIcons } from "../characters/CharacterEditor";
import {
  pointAdd,
  pointEquals,
  pointScale,
  pointSubtract,
} from "../../../shared/point";
import { EmanationArea } from "./Areas";
import { useServerDispatch } from "../../state";
import { useLatest } from "../../useLatest";
import { mapObjectUpdate } from "../../../shared/actions";
import { SmartIntegerInput } from "../ui/TextInput";
import useRafLoop from "../../useRafLoop";
import { useHealthBarMeasurements } from "../../../client/util";
import { PCircle, PRectangle } from "./Primitives";
import * as PIXI from "pixi.js";
import { Container, Sprite } from "react-pixi-fiber";
import { RRMouseEvent, createPixiPortal, colorValue } from "./pixi-utils";
import { PixiTooltip } from "./pixi/PixiTooltip";
import { PixiFontawesomeIcon } from "./pixi/PixiFontawesomeIcon";

const GHOST_TIMEOUT = 6 * 1000;
const GHOST_OPACITY = 0.3;

export const MapToken = React.memo<{
  mapId: RRMapID;
  object: RRToken;
  canStartMoving: boolean;
  onStartMove: (o: RRMapObject, e: RRMouseEvent) => void;
  auraArea: Container | null;
  healthBarArea: Container | null;
  tooltipArea: Container | null;
  zoom: number;
  contrastColor: string;
  smartSetTotalHP: (characterId: RRCharacterID, hp: number) => void;
}>(function MapToken({
  mapId,
  object,
  canStartMoving,
  onStartMove,
  auraArea,
  healthBarArea,
  tooltipArea,
  zoom,
  contrastColor,
  smartSetTotalHP,
}) {
  const myself = useMyProps("id", "isGM", "characterIds");
  const character = useRecoilValue(characterFamily(object.characterId));

  if (!character || !canViewTokenOnMap(character, myself)) {
    return null;
  }

  return (
    <MapTokenInner
      mapId={mapId}
      character={character}
      myself={myself}
      object={object}
      canStartMoving={canStartMoving}
      onStartMove={onStartMove}
      auraArea={auraArea}
      healthBarArea={healthBarArea}
      tooltipArea={tooltipArea}
      zoom={zoom}
      contrastColor={contrastColor}
      smartSetTotalHP={smartSetTotalHP}
    />
  );
});

function MapTokenInner({
  mapId,
  character,
  myself,
  object,
  canStartMoving,
  onStartMove,
  auraArea,
  healthBarArea,
  tooltipArea,
  zoom,
  contrastColor,
  smartSetTotalHP,
}: {
  mapId: RRMapID;
  character: RRCharacter;
  myself: Pick<RRPlayer, "id" | "isGM" | "characterIds">;
  object: RRToken;
  canStartMoving: boolean;
  onStartMove: (o: RRMapObject, e: RRMouseEvent) => void;
  auraArea: Container | null;
  healthBarArea: Container | null;
  tooltipArea: Container | null;
  zoom: number;
  contrastColor: string;
  smartSetTotalHP: (characterId: RRCharacterID, hp: number) => void;
}) {
  const objectRef = useLatest(object);
  const isHovered = useRecoilValue(hoveredMapObjectsFamily(object.id));
  const isSelected = useRecoilValue(selectedMapObjectsFamily(object.id));
  const isHighlighted = useRecoilValue(
    highlightedCharactersFamily(object.characterId)
  );
  const isSelectedOrHovered = isHovered || isSelected;

  const [editorVisible, setEditorVisible] = useState(false);
  const firstMouseDownPos = useRef<RRPoint>();

  const setHP = useCallback(
    (hp: number) => smartSetTotalHP(character.id, hp),
    [smartSetTotalHP, character.id]
  );

  // The previous position of this token before it was moved. Used to display
  // a ghostly image of the token for some time after the move.
  const [ghostPosition, setGhostPosition] = useRecoilState(
    mapObjectGhostPositionsFamily(object.id)
  );

  const canControl = canStartMoving && canControlToken(character, myself);

  const handleMouseDown = useCallback(
    (e: RRMouseEvent) => {
      if (e.button === 0) {
        onStartMove(objectRef.current, e);
      }
      firstMouseDownPos.current = { x: e.clientX, y: e.clientY };
    },
    [onStartMove, objectRef]
  );
  const handleMouseUp = useCallback((e: RRMouseEvent) => {
    if (
      e.button === 2 &&
      firstMouseDownPos.current &&
      pointEquals(firstMouseDownPos.current, { x: e.clientX, y: e.clientY })
    ) {
      setEditorVisible(true);
    }
  }, []);

  const [lerpedPosition, setLerpedPosition] = useState(object.position);
  const prevPositionRef = useRef(object.position);
  const [rafStart, rafStop] = useRafLoop();

  useEffect(() => {
    if (isSelected) {
      setLerpedPosition(object.position);
      prevPositionRef.current = object.position;
    } else {
      rafStart((amount) => {
        if (amount === 1) {
          setLerpedPosition(object.position);
          prevPositionRef.current = object.position;
          return;
        }
        setLerpedPosition(
          pointAdd(
            prevPositionRef.current,
            pointScale(
              pointSubtract(object.position, prevPositionRef.current),
              amount
            )
          )
        );
      }, CURSOR_POSITION_SYNC_DEBOUNCE);

      return () => {
        setLerpedPosition(object.position);
        prevPositionRef.current = object.position;
        rafStop();
      };
    }
  }, [isSelected, object.position, rafStart, rafStop]);

  const tokenSize = GRID_SIZE * character.scale;

  const { x, y } = lerpedPosition;

  const fullTokenRepresentation = (
    position: RRPoint,
    isGhost = false,
    ref: React.LegacyRef<Container> | undefined = undefined
  ) => (
    <Container
      ref={ref}
      angle={object.rotation}
      pivot={{ x: tokenSize / 2, y: tokenSize / 2 }}
      x={position.x + tokenSize / 2}
      y={position.y + tokenSize / 2}
    >
      {isGhost ? (
        <TokenImageOrPlaceholder
          isGhost={true}
          zoom={zoom}
          contrastColor={contrastColor}
          character={character}
          tooltipArea={tooltipArea}
        />
      ) : (
        <TokenImageOrPlaceholder
          isGhost={false}
          zoom={zoom}
          contrastColor={contrastColor}
          character={character}
          canControl={canControl}
          isSelectedOrHovered={isSelectedOrHovered}
          handleMouseDown={handleMouseDown}
          handleMouseUp={handleMouseUp}
          tooltipArea={tooltipArea}
        />
      )}
    </Container>
  );

  const [startAnimation, stopAnimation] = useRafLoop();
  useEffect(() => {
    if (ghostPosition === null) {
      return;
    }
    if (!ghostPosition.fade) {
      if (ghostTokenRef.current) {
        ghostTokenRef.current.alpha = GHOST_OPACITY;
      }
      return;
    }

    startAnimation((amount) => {
      if (ghostTokenRef.current) {
        ghostTokenRef.current.alpha = GHOST_OPACITY * (1 - amount ** 3);
      }
      if (amount === 1) {
        setGhostPosition(null);
      }
    }, GHOST_TIMEOUT);
    return () => {
      stopAnimation();
    };
  }, [ghostPosition, setGhostPosition, startAnimation, stopAnimation]);

  const ghostTokenRef = useRef<Container>(null);

  return (
    <>
      {ghostPosition &&
        fullTokenRepresentation(ghostPosition.position, true, ghostTokenRef)}
      {auraArea &&
        // we need to render the auras as the very first thing in the game so
        // that they are located in the background and still allow users to
        // interact with objects that would otherwise be beneath the auras
        createPixiPortal(
          character.auras.map((aura, i) => (
            <Aura
              key={i}
              character={character}
              aura={aura}
              myself={myself}
              x={x}
              y={y}
            />
          )),
          auraArea
        )}
      {healthBarArea &&
        createPixiPortal(
          <>
            {isCharacterDead(character) && (
              <DeadMarker x={x} y={y} scale={character.scale} />
            )}
            {canControl && character.maxHP > 0 && (
              <Container x={x} y={y - 16} name="healthBar">
                <HealthBar
                  character={character}
                  setHP={setHP}
                  contrastColor={contrastColor}
                />
              </Container>
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
            <Container x={x} y={y} name="condition-icons">
              <ConditionIcons character={character} tooltipArea={tooltipArea} />
            </Container>
          </>,
          healthBarArea
        )}

      {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-constant-condition
        false && canControl ? (
          <Popover
            content={
              <div onMouseDown={(e) => e.stopPropagation()}>
                <CharacterEditor
                  character={character}
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
            <g>{fullTokenRepresentation({ x, y })}</g>
          </Popover>
        ) : (
          fullTokenRepresentation({ x, y })
        )
      }
    </>
  );
}

const TokenImageOrPlaceholder = React.memo(function TokenImageOrPlaceholder({
  zoom,
  contrastColor,
  character,
  tooltipArea,
  ...props
}: {
  zoom: number;
  contrastColor: RRColor;
  character: RRCharacter;
  tooltipArea: Container | null;
} & (
  | {
      isGhost: false;
      canControl: boolean;
      isSelectedOrHovered: boolean;
      handleMouseDown: (e: RRMouseEvent) => void;
      handleMouseUp: (e: RRMouseEvent) => void;
    }
  | { isGhost: true }
)) {
  const tokenSize = GRID_SIZE * character.scale;
  const canControl = props.isGhost ? false : props.canControl;

  // TODO
  const tokenStyle = useMemo(() => {
    const style: React.CSSProperties = {
      ...(props.isGhost
        ? // Do not show any shadows for ghosts and ignore pointer events
          ({ pointerEvents: "none" } as const)
        : isCharacterUnconscious(character)
        ? { filter: "url(#tokenUnconsciousShadow)" }
        : isCharacterHurt(character) && !isCharacterDead(character)
        ? { filter: "url(#tokenHurtShadow)" }
        : isCharacterOverHealed(character)
        ? { filter: "url(#tokenOverHealedShadow)" }
        : {}),
      ...(canControl ? { cursor: "move" } : {}),
      borderRadius: tokenSize / 2,
    };

    if (isCharacterDead(character)) style.filter = "grayscale(100%)";

    return style;
  }, [character, tokenSize, canControl, props.isGhost]);

  const asset = useRecoilValue(assetFamily(character.tokenImageAssetId));
  if (asset?.type !== "image") {
    return null;
  }

  // TODO tokenStyle
  return (
    <>
      <Sprite
        interactive={!props.isGhost}
        cursor={canControl ? "move" : undefined}
        mousedown={
          props.isGhost
            ? undefined
            : (e) => props.handleMouseDown(e.data.originalEvent as MouseEvent)
        }
        width={tokenSize}
        height={tokenSize}
        mouseup={
          props.isGhost
            ? undefined
            : (e) => props.handleMouseUp(e.data.originalEvent as MouseEvent)
        }
        texture={PIXI.Texture.from(
          tokenImageUrl(character, asset, tokenSize * zoom)
        )}
      />

      {!props.isGhost && props.isSelectedOrHovered && (
        <PCircle
          cx={tokenSize / 2}
          cy={tokenSize / 2}
          r={tokenSize / 2 - character.scale * 1.5}
          fill={0x000000}
          alpha={0}
          stroke={parseInt(tinycolor(contrastColor).toHex(), 16)}
          strokeWidth={character.scale * 2.5 + 2}
        />
      )}

      {!props.isGhost && character.visibility !== "everyone" && (
        <PixiTooltip text="only visible to GMs" tooltipArea={tooltipArea}>
          <RoughText
            x={tokenSize / 2}
            y={tokenSize / 2}
            style={{
              fill: "red",
              stroke: "black",
              strokeThickness: 5,
              fontSize: `calc(1.2rem * ${tokenSize / GRID_SIZE})`,
              fontWeight: "bold",
              letterSpacing: 6,
            }}
            angle={-30}
            anchor={{ x: 0.5, y: 0.5 }}
            text="HIDDEN"
          />
        </PixiTooltip>
      )}
    </>
  );
});

const ConditionIcons = React.memo(function ConditionIcons({
  character,
  tooltipArea,
}: {
  character: RRCharacter;
  tooltipArea: Container | null;
}) {
  const tinyIcons = character.conditions.length > 12;
  const iconSize = (tinyIcons ? 12 : 16) * character.scale;
  const iconsPerRow = tinyIcons ? 6 : 4;

  return (
    <>
      {character.conditions.map((condition, index) => {
        const icon = conditionIcons[condition];
        const props = {
          x: (index % iconsPerRow) * iconSize,
          y: Math.floor(index / iconsPerRow) * iconSize,
          width: iconSize,
          height: iconSize,
        };

        return (
          <PixiTooltip
            key={condition}
            text={condition}
            tooltipArea={tooltipArea}
          >
            {typeof icon === "string" ? (
              <Sprite texture={PIXI.Texture.from(icon)} {...props} />
            ) : (
              <PixiFontawesomeIcon
                icon={icon}
                fill="black"
                stroke="white"
                strokeWidth={18}
                {...props}
              />
            )}
          </PixiTooltip>
        );
      })}
    </>
  );
});

function DeadMarker({ x, y, scale }: { x: number; y: number; scale: number }) {
  const TOKEN_SIZE = GRID_SIZE * scale;

  const OUTER_COLOR = "#9b111c";
  const OUTER_SIZE = 6 + 6 * Math.max(0, Math.log(scale));
  const INNER_COLOR = "#E32636";
  const INNER_SIZE = OUTER_SIZE / 3;

  const sharedProps = {
    x,
    w: TOKEN_SIZE,
    roughness: 3,
  };

  const outerProps = {
    ...sharedProps,
    stroke: OUTER_COLOR,
    strokeWidth: OUTER_SIZE,
  };

  const innerProps = {
    ...sharedProps,
    stroke: INNER_COLOR,
    strokeWidth: INNER_SIZE,
  };

  return (
    <Container interactiveChildren={false} name="deadMarker">
      {[outerProps, innerProps].map((props, i) => (
        <React.Fragment key={i}>
          <RoughLine y={y} h={TOKEN_SIZE} {...props} />
          <RoughLine y={y + TOKEN_SIZE} h={-TOKEN_SIZE} {...props} />
        </React.Fragment>
      ))}
    </Container>
  );
}

function MapTokenEditor({ mapId, token }: { mapId: RRMapID; token: RRToken }) {
  const dispatch = useServerDispatch();

  return (
    <>
      <hr />
      <h3>Map Token Settings</h3>
      <label>
        Rotation
        <SmartIntegerInput
          min={-360}
          max={360}
          value={token.rotation}
          onChange={(rotation) =>
            dispatch({
              actions: [
                mapObjectUpdate(mapId, { id: token.id, changes: { rotation } }),
              ],
              optimisticKey: "rotation",
              syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
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
  character,
  aura,
  myself,
}: {
  x: number;
  y: number;
  character: RRCharacter;
  aura: RRAura;
  myself: Pick<RRPlayer, "id" | "isGM" | "characterIds">;
}) {
  if (
    (aura.visibility === "playerOnly" &&
      !myself.characterIds.includes(character.id)) ||
    (aura.visibility === "playerAndGM" &&
      !myself.isGM &&
      !myself.characterIds.includes(character.id))
  ) {
    return null;
  }

  const tokenSize = GRID_SIZE * character.scale;

  const size = (aura.size * GRID_SIZE) / 5 + tokenSize / 2;
  const fill = colorValue(tinycolor(aura.color).setAlpha(0.3));
  switch (aura.shape) {
    case "circle":
      return (
        <>
          <PCircle
            cx={x + tokenSize / 2}
            cy={y + tokenSize / 2}
            fill={fill.color}
            alpha={fill.alpha / 2}
            r={size}
          />
          <EmanationArea
            r={Math.round(aura.size / 5)}
            creatureX={x / GRID_SIZE}
            creatureY={y / GRID_SIZE}
            creatureW={character.scale}
            creatureH={character.scale}
            fill={fill}
          />
        </>
      );
    case "square":
      return (
        <PRectangle
          x={x - size + tokenSize / 2}
          y={y - size + tokenSize / 2}
          fill={fill.color}
          alpha={fill.alpha}
          height={size * 2}
          width={size * 2}
        />
      );
    default:
      assertNever(aura.shape);
  }
}

const HealthBar = React.memo(function HealthBar({
  character,
  contrastColor,
  setHP,
}: {
  character: RRCharacter;
  contrastColor: string;
  setHP: (hp: number) => void;
}) {
  const tokenSize = GRID_SIZE * character.scale;
  const {
    temporaryHPBarWidth,
    hpBarWidth,
    hpColor,
    temporaryHPColor,
    totalMaxHP,
  } = useHealthBarMeasurements(character, tokenSize);

  return (
    <>
      <RoughRectangle
        x={0}
        y={0}
        w={tokenSize}
        h={16}
        stroke="none"
        fill="white"
        fillStyle="solid"
        roughness={1}
      />
      {character.maxHP > 0 && (
        <>
          <RoughRectangle
            x={0}
            y={0}
            w={hpBarWidth}
            h={16}
            stroke="none"
            fill={hpColor}
            fillStyle="solid"
            roughness={0}
          />
          {character.temporaryHP > 0 && temporaryHPBarWidth > 0 && (
            <RoughRectangle
              x={hpBarWidth}
              y={0}
              w={temporaryHPBarWidth}
              h={16}
              stroke="none"
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
        fill="none"
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
      {/* TODO make editable
      <foreignObject x={0} y={2} width={tokenSize / 2 - 4} height={14}>
        <HPInlineEdit hp={character.hp + character.temporaryHP} setHP={setHP} />
      </foreignObject> */}
      <RoughText
        x={4}
        y={-1}
        style={{
          fontWeight: "bold",
          fontSize: 14,
        }}
        text={`${character.hp + character.temporaryHP}`}
      />
      <RoughText
        x={tokenSize / 2 - 3}
        y={-1}
        cursor="default"
        style={{
          fontWeight: "bold",
          fontSize: 14,
        }}
        // \u2009 == &thinsp;
        text={`/\u2009${totalMaxHP}`}
      />
    </>
  );
});
