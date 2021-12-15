import React, { useState } from "react";
import { RRColor } from "../../../shared/state";
import { CollapseButton } from "../CollapseButton";
import { CollapsedLog, Log as FullLog } from "../Log";
import { MapMusicIndicator } from "../map/MapMusicIndicator";
import { Notifications } from "../Notifications";

export function LogHUD({
  mapBackgroundColor,
}: {
  mapBackgroundColor: RRColor;
}) {
  return (
    <div className="absolute bottom-2 right-2 flex flex-col items-end pointer-events-none">
      <div className="w-[382px] flex flex-col items-end">
        <div className="pointer-events-auto">
          <MapMusicIndicator mapBackgroundColor={mapBackgroundColor} />
        </div>
        <div className="pointer-events-auto">
          <Notifications />
        </div>
      </div>
      <div className="w-[422px]">
        <Log />
      </div>
    </div>
  );
}

function Log() {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="flex items-end">
      <div className="w-[32px] mr-[8px] mb-1">
        <CollapseButton
          className="bg-rr-800 hover:bg-rr-700 bg-opacity-90 rounded-full pointer-events-auto"
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          size={32}
        />
      </div>
      <div className="flex-1 pointer-events-auto hud-panel">
        {collapsed ? <CollapsedLog /> : <FullLog />}
      </div>
    </div>
  );
}
