import React, { useState } from "react";
import LagRadar from "react-lag-radar";

if (process.env.NODE_ENV !== "development") {
  throw new Error("The LagRadar should only be included in development.");
}

export default function MyLagRadar() {
  const [hidden, setHidden] = useState(false);

  if (hidden) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        background: "rgba(255, 255, 255, 0.8)",
        borderRadius: 60,
        left: 4,
        bottom: 4,
      }}
      onClick={() => setHidden(true)}
    >
      <LagRadar size={120} />
    </div>
  );
}
