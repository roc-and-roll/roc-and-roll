import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRecoilCallback, useRecoilValue } from "recoil";
import { mapObjectUpdate, mapUpdate } from "../../shared/actions";
import { RRMap, RRMapObjectID, RRPlayer } from "../../shared/state";
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

  const [revealType, setRevealType] = useState<"show" | "hide">("show");

  const selectedMapObjectIds = useRecoilValue(selectedMapObjectIdsAtom);
  const dispatch = useServerDispatch();

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (
        ["INPUT", "BUTTON", "TEXTAREA"].includes(
          (event?.target as HTMLElement)?.nodeName
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
      }
    };
    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
    };
  }, [setDrawType]);

  useEffect(() => {
    setEditState((old) => {
      if (tool === "move") return { tool, updateColor: drawColor };
      if (tool === "measure") return { tool, snap };
      if (tool === "reveal") return { tool, revealType };
      if (tool === "draw")
        return drawType === "text" || drawType === "freehand"
          ? { tool, type: drawType, color: drawColor }
          : { tool, type: drawType, color: drawColor, snap };
      return assertNever(tool);
    });
  }, [tool, drawColor, drawType, snap, setEditState, revealType]);

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
      <Button
        onClick={() => setTool("reveal")}
        className={tool === "reveal" ? "active" : undefined}
      >
        reveal
      </Button>
      {tool === "move" && selectedMapObjectIds.length > 0 && (
        <>
          <ColorInput value={drawColor} onChange={setDrawColor} />
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
          {selectedMapObjectIds.map((selectedMapObjectId) => (
            <MapObjectLockedObserver
              key={selectedMapObjectId}
              id={selectedMapObjectId}
              onLockedStateChanged={onLockedStateChanged}
            />
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
    map.name,
    (name) => mapUpdate({ id: map.id, changes: { name } }),
    1000
  );
  const [
    backgroundColor,
    setBackgroundColor,
  ] = useOptimisticDebouncedServerUpdate(
    map.backgroundColor,
    (backgroundColor) =>
      mapUpdate({ id: map.id, changes: { backgroundColor } }),
    500
  );
  const [gridEnabled, setGridEnabled] = useOptimisticDebouncedServerUpdate(
    map.gridEnabled,
    (gridEnabled) => mapUpdate({ id: map.id, changes: { gridEnabled } }),
    100
  );
  const [gridColor, setGridColor] = useOptimisticDebouncedServerUpdate(
    map.gridColor,
    (gridColor) => mapUpdate({ id: map.id, changes: { gridColor } }),
    100
  );

  const [visible, setVisible] = useState(false);

  return (
    <Popover
      content={
        <>
          <p>
            Name{" "}
            <input
              type="text"
              placeholder="Name of the map"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </p>
          <div>
            Background color{" "}
            <ColorInput value={backgroundColor} onChange={setBackgroundColor} />
          </div>
          <label>
            Grid enabled{" "}
            <input
              type="checkbox"
              checked={gridEnabled}
              onChange={(e) => setGridEnabled(e.target.checked)}
            />
          </label>
          {gridEnabled && (
            <div>
              Grid color{" "}
              <ColorInput value={gridColor} onChange={setGridColor} />
            </div>
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
