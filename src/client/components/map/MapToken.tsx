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
  clamp,
  isCharacterHurt,
  isCharacterOverhealed,
  isCharacterUnconsciousOrDead,
} from "../../../shared/util";
import { useMyself } from "../../myself";
import ReactDOM from "react-dom";
import { HPInlineEdit } from "./HPInlineEdit";
import { useRecoilValue } from "recoil";
import { CURSOR_POSITION_SYNC_DEBOUNCE, hoveredMapObjectsFamily } from "./Map";
import {
  highlightedCharactersFamily,
  selectedMapObjectsFamily,
  characterFamily,
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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { SVGBlurHashImage } from "../blurhash/SVGBlurhashImage";

export const MapToken = React.memo<{
  mapId: RRMapID;
  object: RRToken;
  canStartMoving: boolean;
  onStartMove: (o: RRMapObject, e: React.MouseEvent) => void;
  auraArea: SVGGElement | null;
  healthbarArea: SVGGElement | null;
  zoom: number;
  contrastColor: string;
  smartSetTotalHP: (characterId: RRCharacterID, hp: number) => void;
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
      healthbarArea={healthbarArea}
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
  healthbarArea,
  zoom,
  contrastColor,
  smartSetTotalHP,
}: {
  mapId: RRMapID;
  character: RRCharacter;
  myself: RRPlayer;
  object: RRToken;
  canStartMoving: boolean;
  onStartMove: (o: RRMapObject, e: React.MouseEvent) => void;
  auraArea: SVGGElement | null;
  healthbarArea: SVGGElement | null;
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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      onStartMove(objectRef.current, e);
      firstMouseDownPos.current = { x: e.clientX, y: e.clientY };
    },
    [onStartMove, objectRef]
  );
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
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

  const canControl = canStartMoving && canControlToken(character, myself);

  const fullTokenRepresenation = (
    <g
      transform={`translate(${x}, ${y}), rotate(${object.rotation}, ${
        tokenSize / 2
      }, ${tokenSize / 2})`}
    >
      <TokenImageOrPlaceholder
        zoom={zoom}
        contrastColor={contrastColor}
        character={character}
        canControl={canControl}
        isSelectedOrHovered={isSelectedOrHovered}
        handleMouseDown={handleMouseDown}
        handleMouseUp={handleMouseUp}
      />
    </g>
  );

  return (
    <>
      {auraArea &&
        // we need to render the auras as the very first thing in the SVG so
        // that they are located in the background and still allow users to
        // interact with objects that would otherwise be beneath the auras
        ReactDOM.createPortal(
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
      {healthbarArea &&
        ReactDOM.createPortal(
          <>
            {character.conditions.includes("dead") && (
              <DeadMarker x={x} y={y} scale={character.scale} />
            )}
            {canControl && character.maxHP > 0 && (
              <g transform={`translate(${x},${y - 16})`}>
                <Healthbar
                  character={character}
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
            <g transform={`translate(${x},${y})`}>
              <ConditionIcons
                character={character}
                canControl={canControl}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
              />
            </g>
          </>,
          healthbarArea
        )}
      {canControl ? (
        <Popover
          content={
            <div onMouseDown={(e) => e.stopPropagation()}>
              <CharacterEditor
                isTemplate={false}
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
          <g>{fullTokenRepresenation}</g>
        </Popover>
      ) : (
        fullTokenRepresenation
      )}
    </>
  );
}

const TokenImageOrPlaceholder = React.memo(function TokenImageOrPlaceholder({
  zoom,
  contrastColor,
  character,
  canControl,
  isSelectedOrHovered,
  handleMouseDown,
  handleMouseUp,
}: {
  zoom: number;
  contrastColor: RRColor;
  character: RRCharacter;
  canControl: boolean;
  isSelectedOrHovered: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseUp: (e: React.MouseEvent) => void;
}) {
  const tokenSize = GRID_SIZE * character.scale;

  const tokenStyle = useMemo(
    () => ({
      ...(isCharacterUnconsciousOrDead(character)
        ? { filter: "url(#tokenUnconsciousOrDeadShadow)" }
        : isCharacterHurt(character)
        ? { filter: "url(#tokenHurtShadow)" }
        : isCharacterOverhealed(character)
        ? { filter: "url(#tokenOverhealedShadow)" }
        : {}),
      ...(canControl ? { cursor: "move" } : {}),
      borderRadius: tokenSize / 2,
    }),
    [character, tokenSize, canControl]
  );

  return (
    <>
      <SVGBlurHashImage
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        x={0}
        y={0}
        style={tokenStyle}
        width={tokenSize}
        height={tokenSize}
        image={{
          url: tokenImageUrl(character, tokenSize * zoom),
          blurhash: character.tokenImage.blurhash,
        }}
      />

      {isSelectedOrHovered && (
        <circle
          // do not block pointer events
          pointerEvents="none"
          cx={tokenSize / 2}
          cy={tokenSize / 2}
          r={tokenSize / 2 - 2}
          fill="transparent"
          stroke={contrastColor}
          className="selection-area-highlight"
        />
      )}

      {character.visibility !== "everyone" && (
        <>
          <title>only visible to GMs</title>
          <RoughText
            // do not block pointer events
            pointerEvents="none"
            x={tokenSize / 2}
            y={tokenSize / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="red"
            stroke="black"
            strokeWidth={5}
            paintOrder="stroke"
            fontSize={`calc(1.2rem * ${tokenSize / GRID_SIZE})`}
            fontWeight="bold"
            transform={`rotate(-30, ${tokenSize / 2}, ${tokenSize / 2})`}
            style={{
              letterSpacing: ".3rem",
            }}
          >
            HIDDEN
          </RoughText>
        </>
      )}
    </>
  );
});

const ConditionIcons = React.memo(function ConditionIcons({
  character,
  onMouseDown,
  onMouseUp,
  canControl,
}: {
  character: RRCharacter;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  canControl: boolean;
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
          onMouseDown,
          onMouseUp,
          style: canControl ? { cursor: "move" } : {},
        };

        // TODO: Normally, we'd want to disable pointer events on
        // condition icons, so that clicking on them will still allow
        // you to select and move your token. However, this causes the
        // <title> not to show when hovering the condition icon.
        //
        // pointerEvents="none"

        return typeof icon === "string" ? (
          <image key={condition} href={icon} {...props}>
            <title>{condition}</title>
          </image>
        ) : (
          <React.Fragment key={condition}>
            <FontAwesomeIcon
              icon={icon}
              symbol={`${character.id}/condition-icon/${condition}`}
            />
            <use
              {...props}
              xlinkHref={`#${character.id}/condition-icon/${condition}`}
              color="black"
              style={{
                stroke: "white",
                strokeWidth: 18,
                ...props.style,
              }}
            >
              <title>{condition}</title>
            </use>
          </React.Fragment>
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
    <g pointerEvents="none">
      {[outerProps, innerProps].map((props, i) => (
        <React.Fragment key={i}>
          <RoughLine y={y} h={TOKEN_SIZE} {...props} />
          <RoughLine y={y + TOKEN_SIZE} h={-TOKEN_SIZE} {...props} />
        </React.Fragment>
      ))}
    </g>
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
  myself: RRPlayer;
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
            creatureW={character.scale}
            creatureH={character.scale}
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

const Healthbar = React.memo(function Healthbar({
  character,
  contrastColor,
  setHP,
}: {
  character: RRCharacter;
  contrastColor: string;
  setHP: (hp: number) => void;
}) {
  const tokenSize = GRID_SIZE * character.scale;

  const adjustedMaxHP = character.maxHP + character.maxHPAdjustment;
  const totalMaxHP = adjustedMaxHP + character.temporaryHP;

  const hpColor = "#c5d87c";
  const temporaryHPColor = "#67ac19";

  const hpBarWidth =
    tokenSize *
    clamp(0, character.hp / adjustedMaxHP, 1) *
    (adjustedMaxHP / totalMaxHP);

  const temporaryHPBarWidth = tokenSize * (character.temporaryHP / totalMaxHP);

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
      {character.maxHP > 0 && (
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
          {character.temporaryHP > 0 && temporaryHPBarWidth > 0 && (
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
        <HPInlineEdit hp={character.hp + character.temporaryHP} setHP={setHP} />
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
});
