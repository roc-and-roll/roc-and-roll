import React from "react";
import { IterableElement } from "type-fest";
import { assertNever } from "../../../shared/util";
import { CompendiumSpell } from "../compendium/types";
import {
  capitalize,
  pluralizeIfNeeded,
  stndrdth,
  TextEntry,
} from "./QuickReference";

function MaterialComponents({ m }: { m: CompendiumSpell["components"]["m"] }) {
  if (!m) {
    return null;
  }

  return <>M ({typeof m === "string" ? m : m.text})</>;
}

function formatRange(range: CompendiumSpell["range"]) {
  if (range.type === "special") {
    return "special";
  }

  switch (range.distance.type) {
    case "self":
    case "touch":
    case "sight":
    case "unlimited": {
      if (range.type !== "point") {
        throw range;
      }
      return capitalize(range.distance.type);
    }
    case "feet":
    case "miles": {
      const distance = `${range.distance.amount} ${range.distance.type}`;

      if (range.type === "point") {
        return distance;
      }
      return `Self (${distance} ${range.type})`;
    }
    default:
      assertNever(range.distance);
  }
}

function formatTime(time: IterableElement<CompendiumSpell["time"]>) {
  const formattedUnit = time.unit === "bonus" ? "bonus action" : time.unit;

  let text = `${time.number} ${pluralizeIfNeeded(time.number, formattedUnit)}`;

  if (time.unit === "reaction") {
    text += `, ${time.condition}`;
  }

  return text;
}

function formatDuration(
  duration: IterableElement<CompendiumSpell["duration"]>
) {
  switch (duration.type) {
    case "instant":
      return "Instantaneous";
    case "special":
      return "Special";
    case "timed":
      return `${duration.concentration ? "Concentration, up to " : ""}${
        duration.duration.amount
      } ${pluralizeIfNeeded(duration.duration.amount, duration.duration.type)}`;
    case "permanent":
      return `Until ${duration.ends
        .map((ends) => {
          switch (ends) {
            case "dispel":
              return "dispelled";
            case "trigger":
              return "triggered";
            default:
              assertNever(ends);
          }
        })
        .join(" or ")}`;

    default:
      assertNever(duration);
  }
}

export const Spell = React.memo(function Spell({
  spell,
}: {
  spell: CompendiumSpell;
}) {
  return (
    <>
      <p className="text-2xl mt-4">{spell.name}</p>
      <dl>
        <dt>Level</dt>
        <dd>
          {spell.level === 0
            ? "cantrip"
            : `${spell.level}${stndrdth(spell.level)}`}
        </dd>
        <dt>Casting Time</dt>
        <dd>{spell.time.map((time) => formatTime(time)).join(" or ")}</dd>
        <dt>Range</dt>
        <dd>{formatRange(spell.range)}</dd>
        <dt>Components</dt>
        <dd>
          {[
            spell.components.v === true ? "V" : null,
            spell.components.s === true ? "S" : null,
            spell.components.m ? " " : null,
          ]
            .filter(Boolean)
            .join(", ")}
          <MaterialComponents m={spell.components.m} />
        </dd>
        <dt>Duration</dt>
        <dd>
          {spell.duration.map((duration, i) => (
            <div key={i}>{formatDuration(duration)}</div>
          ))}
        </dd>
      </dl>
      <hr />
      {spell.entries.map((entry, i) => (
        <TextEntry key={i} entry={entry} rollName={spell.name} />
      ))}

      {spell.entriesHigherLevel?.map((entry, i) => (
        <TextEntry key={i} entry={entry} rollName={spell.name} />
      ))}
    </>
  );
});
