import React, { useMemo } from "react";
import tinycolor from "tinycolor2";
import { applyToPoint, inverse, Matrix } from "transformation-matrix";
import { makePoint } from "../shared/point";
import {
  proficiencyValues,
  RRCharacter,
  RRPoint,
  RRTimestamp,
} from "../shared/state";

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};

export const isBrowser = typeof window !== "undefined";

export function formatTimestamp(timestamp: RRTimestamp) {
  return new Date(timestamp).toLocaleString();
}

export const contrastColor = (color: string) =>
  tinycolor.mostReadable(color, ["#000", "#fff"]).toRgbString();

export function useContrastColor(color: string) {
  return useMemo(() => contrastColor(color), [color]);
}

export function isTriggeredByFormElement(e: KeyboardEvent) {
  return (
    ["BUTTON", "SELECT"].includes(
      (e.target as HTMLElement | null)?.nodeName ?? ""
    ) || isTriggeredByTextInput(e)
  );
}

export function isTriggeredByTextInput(e: KeyboardEvent) {
  return ["INPUT", "TEXTAREA"].includes(
    (e.target as HTMLElement | null)?.nodeName ?? ""
  );
}

export function getViewportCorners(transform: Matrix, viewportSize: RRPoint) {
  const inverseTransform = inverse(transform);

  return [
    applyToPoint(inverseTransform, makePoint(0)),
    applyToPoint(inverseTransform, makePoint(0, viewportSize.y)),
    applyToPoint(inverseTransform, viewportSize),
    applyToPoint(inverseTransform, makePoint(viewportSize.x, 0)),
  ] as const;
}

export function linkify(text: string) {
  const matches = text.matchAll(/(^| )(https?:\/\/.+?)\.?(?: |$)/gim);

  const result = [];

  let i = 0;
  for (const match of matches) {
    const start = match.index! + match[1]!.length;
    const end = start + match[2]!.length;
    result.push(text.substring(i, start));
    const url = text.substring(start, end);
    result.push(
      <a key={i} href={url} target="_blank" rel="noreferrer">
        {url}
      </a>
    );
    i = end;
  }

  result.push(text.substring(i));

  return result.filter((each) => each !== "");
}

export function changeHPSmartly(
  character: Pick<RRCharacter, "hp" | "temporaryHP">,
  newTotalHP: number
) {
  const oldTotalHP = character.hp + character.temporaryHP;

  let newTemporaryHP = character.temporaryHP;
  let newHP = character.hp;

  if (newTotalHP < oldTotalHP) {
    const hpToLose = oldTotalHP - newTotalHP;

    newTemporaryHP = Math.max(0, character.temporaryHP - hpToLose);
    newHP = character.hp - Math.max(0, hpToLose - character.temporaryHP);
  } else {
    newHP = newTotalHP - character.temporaryHP;
  }

  return { hp: newHP, temporaryHP: newTemporaryHP };
}

export const highlightMatching = (text: string, search: string) => {
  if (search.length < 1) {
    return text;
  }

  const index = text.toLowerCase().indexOf(search.toLowerCase());
  if (index >= 0) {
    return (
      <>
        {text.substring(0, index)}
        <strong className="search-match">
          {text.substring(index, index + search.length)}
        </strong>
        {text.substring(index + search.length)}
      </>
    );
  }

  return text;
};

export function formatDuration(duration: number) {
  const totalSeconds = Math.round(duration / 1000);

  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 60 / 60);

  const hoursString =
    hours === 0 ? "" : `${hours.toString().padStart(2, "0")}:`;

  return (
    hoursString +
    `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`
  );
}

export function modifierFromStat(statValue: number): number {
  return Math.floor((statValue - 10) / 2);
}

export function getProficiencyValueString(
  proficiency: keyof typeof proficiencyValues | undefined
) {
  return proficiency === 0 || proficiency === undefined
    ? "Not Proficient"
    : proficiency === 0.5
    ? "Half Proficient"
    : proficiency === 1
    ? "Proficient"
    : "Expertise";
}
