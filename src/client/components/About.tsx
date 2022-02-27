import React from "react";

export function About() {
  return (
    <>
      <p>
        Version:{" "}
        <a
          href={`https://github.com/roc-and-roll/roc-and-roll/commit/${encodeURIComponent(
            __VERSION__
          )}`}
          target="_blank"
          rel="noreferrer"
        >
          {__VERSION__}
        </a>
      </p>
    </>
  );
}
