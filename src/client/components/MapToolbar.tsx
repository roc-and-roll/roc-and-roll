import React, { useEffect, useRef, useState } from "react";
import { useRecoilCallback, useRecoilValue } from "recoil";
import { mapObjectUpdate, mapUpdate } from "../../shared/actions";
import { RRMap, RRMapObjectID, RRPlayer } from "../../shared/state";
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
      }
    };
    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
    };
  }, [setDrawType]);

  useEffect(() => {
    setEditState((old) =>
      tool === "move"
        ? { tool, updateColor: drawColor }
        : tool === "measure"
        ? { tool, snap }
        : tool === "draw"
        ? drawType === "text" || drawType === "freehand"
          ? { tool, type: drawType, color: drawColor }
          : { tool, type: drawType, color: drawColor, snap }
        : old
    );
  }, [tool, drawColor, drawType, snap, setEditState]);

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

  useEffect(() => {
    setLockedStates((old) => {
      const newMap = new Map();

      Array.from(old.entries()).forEach(([id, isLocked]) => {
        if (selectedMapObjectIds.includes(id)) {
          newMap.set(id, isLocked);
        }
      });

      return newMap.size === 0 && old.size === 0 ? old : newMap;
    });
  }, [selectedMapObjectIds]);

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
              onLockedStateChanged={(isLocked) => {
                setLockedStates((old) => {
                  if (old.get(selectedMapObjectId) === isLocked) {
                    return old;
                  }
                  const newMap = new Map(old);
                  newMap.set(selectedMapObjectId, isLocked);
                  return newMap;
                });
              }}
            />
          ))}
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
  onLockedStateChanged: (locked: boolean) => void;
}) {
  const mapObject = useRecoilValue(mapObjectsFamily(id));

  const mapObjectLocked = mapObject
    ? mapObject.type === "token"
      ? "ignore"
      : mapObject.locked
    : "ignore";

  useEffect(() => {
    if (mapObjectLocked !== "ignore") {
      onLockedStateChanged(mapObjectLocked);
    }
  }, [mapObjectLocked, onLockedStateChanged]);

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
