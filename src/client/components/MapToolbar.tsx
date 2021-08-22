import clsx from "clsx";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRecoilCallback, useRecoilValue } from "recoil";
import { mapObjectUpdate, mapSettingsUpdate } from "../../shared/actions";
import {
  RRMap,
  RRMapID,
  RRMapObject,
  RRMapObjectID,
  RRObjectVisibility,
  RRPlayer,
} from "../../shared/state";
import { assertNever } from "../../shared/util";
import { useServerDispatch } from "../state";
import useLocalState from "../useLocalState";
import { MapEditState, MapSnap } from "./map/MapContainer";
import { mapObjectsFamily, selectedMapObjectIdsAtom } from "./map/recoil";
import { Popover } from "./Popover";
import { Button } from "./ui/Button";
import { SmartColorInput, ColorInput } from "./ui/ColorInput";
import { Select } from "./ui/Select";
import { isTriggeredByFormElement } from "../util";
import { SmartTextInput } from "./ui/TextInput";
import EmojiPicker from "emoji-picker-react";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../shared/constants";
// TODO: Lazy loding the emoji picker does not play nicely with Tippy :/
// const EmojiPicker = React.lazy(
//   () => import(/* webpackPrefetch: true */ "emoji-picker-react")
// );

type NonTokenMapObject = Exclude<RRMapObject, { type: "token" }>;

function useIndeterminateBoolean<K extends keyof NonTokenMapObject>({
  mapId,
  property,
  label,
  toBoolean,
  fromBoolean,
}: {
  mapId: RRMapID;
  property: K;
  label: string;
  toBoolean: (value: NonTokenMapObject[K]) => boolean;
  fromBoolean: (value: boolean) => NonTokenMapObject[K];
}) {
  const dispatch = useServerDispatch();

  const updateValue = useRecoilCallback(({ snapshot }) => (value: boolean) => {
    dispatch(
      snapshot
        .getLoadable(selectedMapObjectIdsAtom)
        .getValue()
        .flatMap((selectedMapObjectId) => {
          if (
            snapshot
              .getLoadable(mapObjectsFamily(selectedMapObjectId))
              .getValue()?.type === "token"
          ) {
            return [];
          }
          return mapObjectUpdate(mapId, {
            id: selectedMapObjectId,
            changes: { [property]: fromBoolean(value) },
          });
        })
    );
  });

  const [states, setStates] = useState(new Map<RRMapObjectID, boolean>());

  const checkboxRef = useRef<HTMLInputElement | null>(null);

  const isToggleChecked = Array.from(states.values()).every((value) => value);
  const isToggleIndeterminate =
    !isToggleChecked && Array.from(states.values()).some((value) => value);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isToggleIndeterminate;
    }
  }, [isToggleIndeterminate]);

  const onStateChanged = useCallback(
    (selectedMapObjectId: RRMapObjectID, value: boolean | "remove") => {
      setStates((oldMap) => {
        if (value === "remove") {
          if (!oldMap.has(selectedMapObjectId)) {
            return oldMap;
          }
          const newMap = new Map(oldMap);
          newMap.delete(selectedMapObjectId);
          return newMap;
        }
        if (oldMap.get(selectedMapObjectId) === value) {
          return oldMap;
        }
        const newMap = new Map(oldMap);
        newMap.set(selectedMapObjectId, value);
        return newMap;
      });
    },
    []
  );

  const widget = (selectedMapObjectIds: ReadonlyArray<RRMapObjectID>) => (
    <>
      {states.size > 0 && (
        // states.size can be 0 if only tokens are selected
        <label>
          {label}
          <input
            type="checkbox"
            checked={isToggleChecked}
            ref={checkboxRef}
            onChange={(e) =>
              updateValue(isToggleIndeterminate ? true : e.target.checked)
            }
          />
        </label>
      )}
      {selectedMapObjectIds.map((selectedMapObjectId) => (
        <MapObjectObserverIndeterminateBoolean<K>
          key={selectedMapObjectId}
          id={selectedMapObjectId}
          property={property}
          toBoolean={toBoolean}
          onStateChanged={onStateChanged}
        />
      ))}
    </>
  );

  return {
    widget,
  };
}

export const MapToolbar = React.memo<{
  mapId: RRMapID;
  mapSettings: RRMap["settings"];
  myself: RRPlayer;
  setEditState: React.Dispatch<React.SetStateAction<MapEditState>>;
}>(function MapToolbar({ mapId, mapSettings, myself, setEditState }) {
  const [tool, setTool] = useState<MapEditState["tool"]>("move");

  const [drawType, setDrawType] = useLocalState<
    Extract<MapEditState, { tool: "draw" }>["type"]
  >("map/toolbar/drawType", "freehand");
  const [drawColor, setDrawColor] = useState(myself.color);
  const [snap, setSnap] = useLocalState<MapSnap>("map/toolbar/snap", "grid");
  const [defaultVisibility, setDefaultVisibility] =
    useLocalState<RRObjectVisibility>(
      "map/toolbar/defaultVisibility",
      "everyone"
    );

  const [favoritedReactions, setFavoritedReactions] = useLocalState<string[]>(
    "map/toolbar/favoritedReactions",
    []
  );
  const [reactionCode, setReactionCode] = useLocalState<string>(
    "map/toolbar/reactionCode",
    "🥰"
  );
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);

  const [revealType, setRevealType] = useState<"show" | "hide">("show");

  const selectedMapObjectIds = useRecoilValue(selectedMapObjectIdsAtom);
  const dispatch = useServerDispatch();

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (isTriggeredByFormElement(event)) {
        return;
      }
      switch (event.key) {
        case "r":
          setTool("draw");
          setDrawType("rectangle");
          break;
        case "v":
          setTool("move");
          break;
        case "m":
          setTool("measure");
          break;
        case "f":
          setTool("reveal");
          break;
        case "e":
          setTool("react");
          break;
      }
    };
    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
    };
  }, [setDrawType]);

  useEffect(() => {
    setEditState(() => {
      switch (tool) {
        case "move":
          return { tool, updateColor: drawColor };
        case "measure":
          return { tool, snap };
        case "reveal":
          return { tool, revealType };
        case "draw":
          return drawType === "text" || drawType === "freehand"
            ? {
                tool,
                type: drawType,
                color: drawColor,
                visibility: defaultVisibility,
              }
            : {
                tool,
                type: drawType,
                color: drawColor,
                snap,
                visibility: defaultVisibility,
              };
        case "react":
          return { tool, reactionCode };
        default:
          assertNever(tool);
      }
    });
  }, [tool, drawColor, drawType, snap, setEditState, revealType, defaultVisibility, reactionCode]);

  const locked = useIndeterminateBoolean({
    mapId,
    label: "lock",
    property: "locked",
    toBoolean: (locked) => locked,
    fromBoolean: (locked) => locked,
  });

  const hidden = useIndeterminateBoolean({
    mapId,
    label: "hide",
    property: "visibility",
    toBoolean: (visibility) => visibility === "gmOnly",
    fromBoolean: (hidden) => (hidden ? "gmOnly" : "everyone"),
  });

  const hideAll = () => {
    dispatch(mapSettingsUpdate({ id: mapId, changes: { revealedAreas: [] } }));
  };

  const revealAll = () => {
    dispatch(
      mapSettingsUpdate({ id: mapId, changes: { revealedAreas: null } })
    );
  };

  return (
    <div className="map-toolbar">
      <Button
        onClick={() => setTool("move")}
        className={tool === "move" ? "active" : undefined}
      >
        select / move
      </Button>
      <Button
        onClick={() => setTool("draw")}
        className={tool === "draw" ? "active" : undefined}
      >
        draw
      </Button>
      <Button
        onClick={() => setTool("measure")}
        className={tool === "measure" ? "active" : undefined}
      >
        measure
      </Button>
      {myself.isGM && (
        <Button
          onClick={() => setTool("reveal")}
          className={clsx(
            tool === "reveal" ? "active" : undefined,
            "gm-button"
          )}
        >
          reveal
        </Button>
      )}
      <Button
        onClick={() => setTool("react")}
        className={tool === "react" ? "active" : undefined}
      >
        react
      </Button>
      {tool === "move" && selectedMapObjectIds.length > 0 && (
        <>
          <ColorInput value={drawColor} onChange={setDrawColor} />
          {locked.widget(selectedMapObjectIds)}
          {hidden.widget(selectedMapObjectIds)}
        </>
      )}
      {tool === "react" && (
        <>
          <Popover
            className="popover-no-padding"
            content={
              <EmojiPicker
                native={true}
                onEmojiClick={(_, { emoji }) => {
                  setEmojiPickerVisible(false);
                  setReactionCode(emoji);
                }}
              />
            }
            visible={emojiPickerVisible}
            onClickOutside={() => setEmojiPickerVisible(false)}
            interactive
            placement="bottom"
          >
            <Button
              onClick={() => setEmojiPickerVisible((t) => !t)}
              className={emojiPickerVisible ? "active" : undefined}
            >
              select
            </Button>
          </Popover>
          <Button
            onClick={() =>
              setFavoritedReactions((l) =>
                l.includes(reactionCode)
                  ? l.filter((e) => e !== reactionCode)
                  : [reactionCode, ...l]
              )
            }
          >
            {favoritedReactions.includes(reactionCode) ? "unfav" : "fav"}
            {reactionCode}
          </Button>
          {favoritedReactions.map((code) => (
            <Button
              key={code}
              className={reactionCode === code ? "active" : undefined}
              onClick={() => setReactionCode(code)}
            >
              {code}
            </Button>
          ))}
        </>
      )}
      {tool === "reveal" && (
        <>
          <Button
            className={revealType === "show" ? "active" : undefined}
            onClick={() => setRevealType("show")}
          >
            Show
          </Button>
          <Button
            className={revealType === "hide" ? "active" : undefined}
            onClick={() => setRevealType("hide")}
          >
            Hide
          </Button>
          <Button onClick={hideAll}>Hide all</Button>
          <Button onClick={revealAll}>Reveal all</Button>
        </>
      )}
      {tool === "draw" && (
        <>
          <Button
            onClick={() => setDrawType("freehand")}
            className={drawType === "freehand" ? "active" : undefined}
          >
            draw freehand
          </Button>
          <Button
            onClick={() => setDrawType("line")}
            className={drawType === "line" ? "active" : undefined}
          >
            draw line
          </Button>
          <Button
            onClick={() => setDrawType("polygon")}
            className={drawType === "polygon" ? "active" : undefined}
          >
            draw polygon
          </Button>
          <Button
            onClick={() => setDrawType("rectangle")}
            className={drawType === "rectangle" ? "active" : undefined}
          >
            draw rectangle
          </Button>
          <Button
            onClick={() => setDrawType("ellipse")}
            className={drawType === "ellipse" ? "active" : undefined}
          >
            draw ellipse
          </Button>
          <Button
            onClick={() => setDrawType("text")}
            className={drawType === "text" ? "active" : undefined}
          >
            write text
          </Button>
          <Button
            onClick={() => setDrawType("image")}
            className={drawType === "image" ? "active" : undefined}
          >
            add background image
          </Button>
          <>
            <ColorInput value={drawColor} onChange={setDrawColor} />
            <label>
              Default Visibility
              <Select
                value={defaultVisibility}
                onChange={setDefaultVisibility}
                options={[
                  { value: "gmOnly", label: "GM only" },
                  { value: "everyone", label: "Everyone" },
                ]}
              />
            </label>
            {drawType !== "freehand" && drawType !== "text" && (
              <label>
                snap to grid{" "}
                <Select
                  value={snap}
                  onChange={(snap) => setSnap(snap)}
                  options={[
                    { value: "none", label: "none" },
                    { value: "grid", label: "grid center and corners" },
                    { value: "grid-center", label: "grid center" },
                    { value: "grid-corner", label: "grid corners" },
                  ]}
                />
              </label>
            )}
          </>
        </>
      )}
      {myself.isGM && <MapSettings mapId={mapId} mapSettings={mapSettings} />}
    </div>
  );
});

function MapObjectObserverIndeterminateBoolean<
  K extends keyof NonTokenMapObject
>({
  id,
  onStateChanged,
  property,
  toBoolean,
}: {
  id: RRMapObjectID;
  property: K;
  toBoolean: (value: NonTokenMapObject[K]) => boolean;
  onStateChanged: (id: RRMapObjectID, value: boolean | "remove") => void;
}) {
  const mapObject = useRecoilValue(mapObjectsFamily(id));

  const value =
    !mapObject || mapObject.type === "token"
      ? "ignore"
      : toBoolean(mapObject[property]);

  useEffect(() => {
    if (value !== "ignore") {
      onStateChanged(id, value);
    }
  }, [id, value, onStateChanged]);

  useEffect(() => {
    // When this map object is no longer selected, remove its state from the
    // map.
    return () => onStateChanged(id, "remove");
  }, [id, onStateChanged]);

  return null;
}

function MapSettings({
  mapId,
  mapSettings,
}: {
  mapId: RRMapID;
  mapSettings: RRMap["settings"];
}) {
  const [visible, setVisible] = useState(false);
  const dispatch = useServerDispatch();

  return (
    <Popover
      content={
        <>
          <label>
            Name{" "}
            <SmartTextInput
              type="text"
              placeholder="Name of the map"
              value={mapSettings.name}
              onChange={(name) =>
                dispatch({
                  actions: [
                    mapSettingsUpdate({ id: mapId, changes: { name } }),
                  ],
                  optimisticKey: "name",
                  syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
                })
              }
            />
          </label>
          <label>
            Background color{" "}
            <SmartColorInput
              value={mapSettings.backgroundColor}
              onChange={(backgroundColor) =>
                dispatch({
                  actions: [
                    mapSettingsUpdate({
                      id: mapId,
                      changes: { backgroundColor },
                    }),
                  ],
                  optimisticKey: "backgroundColor",
                  syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
                })
              }
            />
          </label>
          <label>
            Grid enabled{" "}
            <input
              type="checkbox"
              checked={mapSettings.gridEnabled}
              onChange={(e) =>
                dispatch({
                  actions: [
                    mapSettingsUpdate({
                      id: mapId,
                      changes: { gridEnabled: e.target.checked },
                    }),
                  ],
                  optimisticKey: "gridEnabled",
                  syncToServerThrottle: 0,
                })
              }
            />
          </label>
          {mapSettings.gridEnabled && (
            <label>
              Grid color{" "}
              <SmartColorInput
                value={mapSettings.gridColor}
                onChange={(gridColor) =>
                  dispatch({
                    actions: [
                      mapSettingsUpdate({
                        id: mapId,
                        changes: { gridColor },
                      }),
                    ],
                    optimisticKey: "gridColor",
                    syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
                  })
                }
              />
            </label>
          )}
        </>
      }
      interactive
      placement="bottom-end"
      onClickOutside={() => setVisible(false)}
      visible={visible}
    >
      <Button className="gm-button" onClick={() => setVisible(true)}>
        map settings
      </Button>
    </Popover>
  );
}
