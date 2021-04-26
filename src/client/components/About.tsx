import React from "react";

export function About() {
  return (
    <>
      <p>
        Version:{" "}
        <a
          href={`https://github.com/cmfcmf/roc-and-roll/commit/${encodeURIComponent(
            __VERSION__
          )}`}
        >
          {__VERSION__}
        </a>
      </p>
    </>
  );
}
