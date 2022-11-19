import { matchSorter } from "match-sorter";
import React, { useDeferredValue, useMemo, useState } from "react";
import { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { IterableElement } from "type-fest";
import { assertNever } from "../../../shared/util";
import { useCompendium } from "../compendium/Compendium";
import { CompendiumSpell, CompendiumTextEntry } from "../compendium/types";

export default function QuickReference({ onClose }: { onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return ReactDOM.createPortal(
    <div
      className="quick-reference"
      onClick={(e) => e.target === backdropRef.current && onClose()}
      ref={backdropRef}
    >
      <div className="quick-reference-modal">
        <h1>Quick Reference</h1>
        <input
          type="search"
          placeholder="Search..."
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Spells
          search={deferredSearch}
          searchIsStale={search !== deferredSearch}
        />
      </div>
    </div>,
    document.body
  );
}

function Spells({
  search,
  searchIsStale,
}: {
  search: string;
  searchIsStale: boolean;
}) {
  const { sources: compendiumSources } = useCompendium();

  const spells = useMemo(
    () =>
      matchSorter(
        compendiumSources.flatMap((source) => source.data.spell),
        search,
        { keys: ["name"] }
      ),
    [compendiumSources, search]
  );

  return (
    <ul style={searchIsStale ? { opacity: 0.7 } : {}}>
      {spells.map((spell) => (
        <li key={spell.name}>
          <Spell spell={spell} />
        </li>
      ))}
    </ul>
  );
}

function stndrdth(number: number) {
  switch (number) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function capitalize(string: string) {
  return `${string.slice(0, 1).toUpperCase()}${string.slice(1)}`;
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

const Spell = React.memo(function Spell({ spell }: { spell: CompendiumSpell }) {
  return (
    <>
      <h2>{spell.name}</h2>
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
        <TextEntry key={i} entry={entry} />
      ))}

      {spell.entriesHigherLevel?.map((entry, i) => (
        <TextEntry key={i} entry={entry} />
      ))}
    </>
  );
});

function pluralizeIfNeeded(value: number, unit: string) {
  if (value === 1) {
    return unit;
  }
  return `${unit}s`;
}

function MaterialComponents({ m }: { m: CompendiumSpell["components"]["m"] }) {
  if (!m) {
    return null;
  }

  return <>M ({typeof m === "string" ? m : m.text})</>;
}

function TextEntry({ entry }: { entry: CompendiumTextEntry }) {
  if (typeof entry === "string") return <p>{entry}</p>;

  switch (entry.type) {
    case "entries": {
      return (
        <div>
          <p>
            <strong>{entry.name}</strong>
          </p>
          {entry.entries.map((each, i) => (
            <TextEntry key={i} entry={each} />
          ))}
        </div>
      );
    }

    case "list": {
      return (
        <ul>
          {entry.items.map((each, i) => (
            <li key={i}>
              <TextEntry entry={each} />
            </li>
          ))}
        </ul>
      );
    }

    case "table": {
      return (
        <div>
          {entry.caption && (
            <p>
              <strong>{entry.caption}</strong>
            </p>
          )}
          <table>
            <thead>
              <tr>
                {entry.colLabels.map((each, i) => (
                  <th key={i}>{each}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entry.rows.map((row, y) => (
                <tr key={y}>
                  {row.map((cell, x) => (
                    <td key={x}>
                      <TextEntry entry={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "cell": {
      if ("exact" in entry.roll) {
        return <>{entry.roll.exact}</>;
      }

      const min = entry.roll.pad
        ? entry.roll.min.toString().padStart(2, "0")
        : entry.roll.min;
      const max = entry.roll.pad
        ? entry.roll.max.toString().padStart(2, "0")
        : entry.roll.max;

      return (
        <>
          {min} &ndash; {max}
        </>
      );
    }
  }
}
