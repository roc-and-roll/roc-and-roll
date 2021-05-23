import clsx from "clsx";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRecoilCallback, useRecoilValue } from "recoil";
import { mapObjectUpdate, mapUpdate } from "../../shared/actions";
import {
  byId,
  RRMap,
  RRMapObjectID,
  RRObjectVisibility,
  RRPlayer,
} from "../../shared/state";
import { assertNever } from "../../shared/util";
import {
  useOptimisticDebouncedServerUpdate,
  useServerDispatch,
} from "../state";
import useLocalState from "../useLocalState";
import {
  MapEditState,
  mapObjectsFamily,
  MapSnap,
  selectedMapObjectIdsAtom,
} from "./map/MapContainer";
import { Popover } from "./Popover";
import { Button } from "./ui/Button";
import { ColorInput } from "./ui/ColorInput";
import { Select } from "./ui/Select";
import Picker from "emoji-picker-react";

export const MapToolbar = React.memo<{
  map: RRMap;
  myself: RRPlayer;
  setEditState: React.Dispatch<React.SetStateAction<MapEditState>>;
}>(function MapToolbar({ map, myself, setEditState }) {
  const [tool, setTool] = useState<MapEditState["tool"]>("move");

  const [drawType, setDrawType] = useLocalState<
    Extract<MapEditState, { tool: "draw" }>["type"]
  >("map/toolbar/drawType", "freehand");
  const [drawColor, setDrawColor] = useState(myself.color);
  const [snap, setSnap] = useLocalState<MapSnap>("map/toolbar/snap", "grid");
  const [
    defaultVisibility,
    setDefaultVisibility,
  ] = useLocalState<RRObjectVisibility>(
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
      if (
        ["INPUT", "BUTTON", "TEXTAREA"].includes(
          (event.target as HTMLElement | null)?.nodeName ?? ""
        )
      ) {
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

  const updateLock = useRecoilCallback(({ snapshot }) => (locked: boolean) => {
    dispatch(
      snapshot
        .getLoadable(selectedMapObjectIdsAtom)
        .getValue()
        .flatMap((selectedMapObjectId) => {
          if (
            snapshot
              .getLoadable(mapObjectsFamily(selectedMapObjectId))
              .getValue()?.type === "token"
          )
            return [];
          return mapObjectUpdate(map.id, {
            id: selectedMapObjectId,
            changes: { locked },
          });
        })
    );
  });

  const [lockedStates, setLockedStates] = useState(
    new Map<RRMapObjectID, boolean>()
  );

  const lockedCheckboxRef = useRef<HTMLInputElement | null>(null);

  const isLockedToggleChecked = Array.from(lockedStates.values()).every(
    (locked) => locked
  );
  const isLockedToggleIndeterminate =
    Array.from(lockedStates.values()).some((locked) => locked) &&
    !isLockedToggleChecked;

  useEffect(() => {
    if (lockedCheckboxRef.current) {
      lockedCheckboxRef.current.indeterminate = isLockedToggleIndeterminate;
    }
  }, [isLockedToggleIndeterminate]);

  const onLockedStateChanged = useCallback(
    (selectedMapObjectId: RRMapObjectID, isLocked: boolean | "remove") => {
      setLockedStates((oldMap) => {
        if (isLocked === "remove") {
          const newMap = new Map(oldMap);
          newMap.delete(selectedMapObjectId);
          return newMap.size === oldMap.size ? oldMap : newMap;
        }
        if (oldMap.get(selectedMapObjectId) === isLocked) {
          return oldMap;
        }
        const newMap = new Map(oldMap);
        newMap.set(selectedMapObjectId, isLocked);
        return newMap;
      });
    },
    []
  );

  const hideAll = () => {
    dispatch(mapUpdate({ id: map.id, changes: { revealedAreas: [] } }));
  };

  const revealAll = () => {
    dispatch(mapUpdate({ id: map.id, changes: { revealedAreas: null } }));
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
          {lockedStates.size > 0 && (
            // lockedStates.size can be 0 if only tokens are selected
            <label className="locked-toggle">
              lock
              <input
                type="checkbox"
                checked={isLockedToggleChecked}
                ref={lockedCheckboxRef}
                onChange={(e) =>
                  updateLock(
                    isLockedToggleIndeterminate ? true : e.target.checked
                  )
                }
              />
            </label>
          )}
          {selectedMapObjectIds.map((selectedMapObjectId) => (
            <MapObjectLockedObserver
              key={selectedMapObjectId}
              id={selectedMapObjectId}
              onLockedStateChanged={onLockedStateChanged}
            />
          ))}
        </>
      )}
      {tool === "react" && (
        <>
          <Popover
            className="popover-no-padding"
            content={
              <Picker
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
            <Button onClick={() => setEmojiPickerVisible((t) => !t)}>
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
      {myself.isGM && <MapSettings map={map} />}
    </div>
  );
});

function MapObjectLockedObserver({
  id,
  onLockedStateChanged,
}: {
  id: RRMapObjectID;
  onLockedStateChanged: (id: RRMapObjectID, locked: boolean | "remove") => void;
}) {
  const mapObject = useRecoilValue(mapObjectsFamily(id));

  const mapObjectLocked = mapObject
    ? mapObject.type === "token"
      ? "ignore"
      : mapObject.locked
    : "ignore";

  useEffect(() => {
    if (mapObjectLocked !== "ignore") {
      onLockedStateChanged(id, mapObjectLocked);
    }
  }, [id, mapObjectLocked, onLockedStateChanged]);

  useEffect(() => {
    // When this map object is no longer selected, remove its lockedState from
    // the map.
    return () => onLockedStateChanged(id, "remove");
  }, [id, onLockedStateChanged]);

  return null;
}

function MapSettings({ map }: { map: RRMap }) {
  const [name, setName] = useOptimisticDebouncedServerUpdate(
    (state) => byId(state.maps.entities, map.id)?.name ?? "",
    (name) => mapUpdate({ id: map.id, changes: { name } }),
    1000
  );
  const [
    backgroundColor,
    setBackgroundColor,
  ] = useOptimisticDebouncedServerUpdate(
    (state) => byId(state.maps.entities, map.id)?.backgroundColor ?? "",
    (backgroundColor) =>
      mapUpdate({ id: map.id, changes: { backgroundColor } }),
    500
  );
  const [gridEnabled, setGridEnabled] = useOptimisticDebouncedServerUpdate(
    (state) => byId(state.maps.entities, map.id)?.gridEnabled ?? false,
    (gridEnabled) => mapUpdate({ id: map.id, changes: { gridEnabled } }),
    100
  );
  const [gridColor, setGridColor] = useOptimisticDebouncedServerUpdate(
    (state) => byId(state.maps.entities, map.id)?.gridColor ?? "",
    (gridColor) => mapUpdate({ id: map.id, changes: { gridColor } }),
    100
  );

  const [visible, setVisible] = useState(false);

  return (
    <Popover
      content={
        <>
          <label>
            Name{" "}
            <input
              type="text"
              placeholder="Name of the map"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Background color{" "}
            <ColorInput value={backgroundColor} onChange={setBackgroundColor} />
          </label>
          <label>
            Grid enabled{" "}
            <input
              type="checkbox"
              checked={gridEnabled}
              onChange={(e) => setGridEnabled(e.target.checked)}
            />
          </label>
          {gridEnabled && (
            <label>
              Grid color{" "}
              <ColorInput value={gridColor} onChange={setGridColor} />
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
