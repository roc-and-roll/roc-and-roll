import React, { useEffect, useState } from "react";
import { mapUpdate } from "../../shared/actions";
import { RRMap } from "../../shared/state";
import { useMyself } from "../myself";
import { useDebouncedServerUpdate } from "../state";
import useLocalState from "../useLocalState";
import { MapEditState, MapSnap } from "./MapContainer";
import { Popover } from "./Popover";
import { Button } from "./ui/Button";

export function MapToolbar({
  map,
  setEditState,
}: {
  map: RRMap;
  setEditState: React.Dispatch<React.SetStateAction<MapEditState>>;
}) {
  const myself = useMyself();

  const [tool, setTool] = useState<MapEditState["tool"]>("move");

  const [drawType, setDrawType] = useState<
    Extract<MapEditState, { tool: "draw" }>["type"]
  >("freehand");
  const [drawColor, setDrawColor] = useState(myself.color);
  const [snap, setSnap] = useLocalState<MapSnap>("toolbar/snap", "grid");

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
      }
    };
    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
    };
  }, []);

  useEffect(() => {
    setEditState((old) =>
      tool === "move"
        ? { tool }
        : tool === "measure"
        ? { tool, snap }
        : tool === "draw"
        ? drawType === "text" || drawType === "freehand"
          ? { tool, type: drawType, color: drawColor }
          : { tool, type: drawType, color: drawColor, snap }
        : old
    );
  }, [tool, drawColor, drawType, snap, setEditState]);

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
            <input
              type="color"
              value={drawColor}
              onChange={(e) => setDrawColor(e.target.value)}
            />
            {drawType !== "freehand" && drawType !== "text" && (
              <label>
                snap to grid{" "}
                <select
                  value={snap}
                  onChange={(e) => setSnap(e.target.value as MapSnap)}
                >
                  <option value="none">none</option>
                  <option value="grid">grid center and corners</option>
                  <option value="grid-center">grid center</option>
                  <option value="grid-corner">grid corners</option>
                </select>
              </label>
            )}
          </>
        </>
      )}
      {myself.isGM && <MapSettings map={map} />}
    </div>
  );
}

function MapSettings({ map }: { map: RRMap }) {
  const [name, setName] = useDebouncedServerUpdate(
    map.name,
    (name) => mapUpdate({ id: map.id, changes: { name } }),
    1000
  );
  const [backgroundColor, setBackgroundColor] = useDebouncedServerUpdate(
    map.backgroundColor,
    (backgroundColor) =>
      mapUpdate({ id: map.id, changes: { backgroundColor } }),
    500
  );
  const [gridEnabled, setGridEnabled] = useDebouncedServerUpdate(
    map.gridEnabled,
    (gridEnabled) => mapUpdate({ id: map.id, changes: { gridEnabled } }),
    100
  );

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
          <p>
            Background color{" "}
            <input
              type="color"
              placeholder="Background color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
            />
          </p>
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
      trigger="click"
    >
      <Button className="gm-button">map settings</Button>
    </Popover>
  );
}
