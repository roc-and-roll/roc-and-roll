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
      className="fixed bottom-2 right-[450px] rounded-full bg-white bg-opacity-80"
      onClick={() => setHidden(true)}
    >
      <LagRadar size={120} />
    </div>
  );
}
