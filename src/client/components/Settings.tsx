import React, { useContext } from "react";
import { SoundContext } from "../sound";

export function Settings() {
  const { volume, setVolume } = useContext(SoundContext);

  return (
    <p>
      Volume{" "}
      <input
        type="range"
        value={volume}
        min={0}
        step={0.01}
        max={1}
        onChange={(e) => setVolume(e.target.valueAsNumber)}
      />
      {volume}
    </p>
  );
}
