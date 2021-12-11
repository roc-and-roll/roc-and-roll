import { matchSorter } from "match-sorter";
import React, { useDeferredValue, useMemo, useState } from "react";
import { useEffect, useRef } from "react";
import { IterableElement, Promisable } from "type-fest";
import { logEntryDiceRollAdd } from "../../../shared/actions";
import { RRLogEntryDiceRoll } from "../../../shared/state";
import { assertNever } from "../../../shared/util";
import { usePrompt } from "../../dialog-boxes";
import {
  roll,
  parseDiceStringAndRoll,
  isValidDiceString,
} from "../../dice-rolling/roll";
import { useMyProps } from "../../myself";
import { useServerDispatch } from "../../state";
import { useCompendium } from "../compendium/Compendium";
import { CompendiumSpell, CompendiumTextEntry } from "../compendium/types";
import { Dialog, DialogContent, DialogTitle } from "../Dialog";
import { SmartTextInput } from "../ui/TextInput";
import "./QuickReference.scss";

export default function QuickReference({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <Dialog open onClose={onClose} className="quick-reference-modal">
      <DialogTitle>Quick Reference</DialogTitle>
      <SmartTextInput
        type="search"
        placeholder="Search..."
        ref={inputRef}
        value={search}
        onChange={(search) => setSearch(search)}
      />
      <DialogContent>
        <Spells
          search={deferredSearch}
          searchIsStale={search !== deferredSearch}
        />
      </DialogContent>
    </Dialog>
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
        <TextEntry key={i} entry={entry} spell={spell} />
      ))}

      {spell.entriesHigherLevel?.map((entry, i) => (
        <TextEntry key={i} entry={entry} spell={spell} />
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

export function* getPartsFromTextEntryString(text: string) {
  let textIdx = 0;

  while (textIdx < text.length) {
    const cmdStartIdx = text.indexOf("{", textIdx);
    if (cmdStartIdx === -1) {
      yield text.substring(textIdx);
      return;
    }

    if (textIdx !== cmdStartIdx) {
      yield text.substring(textIdx, cmdStartIdx);
    }

    let openedBrackets = 1;

    let cmdEndIdx = -1;
    let searchIdx = cmdStartIdx;
    while (openedBrackets > 0) {
      const nextClosingBracket = text.indexOf("}", searchIdx + 1);
      const nextOpeningBracket = text.indexOf("{", searchIdx + 1);
      if (nextClosingBracket === -1) {
        throw new Error(`No matching closing bracket (})`);
      }

      if (
        nextOpeningBracket === -1 ||
        nextClosingBracket < nextOpeningBracket
      ) {
        // No other command is nested inside this command.
        openedBrackets--;
        cmdEndIdx = nextClosingBracket;
      } else {
        // Another command is nested inside this command.
        openedBrackets++;
        searchIdx = nextClosingBracket;
      }
    }

    yield text.substring(cmdStartIdx, cmdEndIdx + 1);

    textIdx = cmdEndIdx + 1;
  }
}

function formatModifier(modifier: number) {
  return modifier < 0 ? modifier.toString() : `+${modifier}`;
}

function assertIsInteger(string: string) {
  if (
    process.env.NODE_ENV !== "production" &&
    /^(\+|-)?\d+$/.exec(string) === null
  ) {
    throw new Error(`Expected a number, got ${string}`);
  }
}

function RollLink({
  text,
  roll,
}: {
  text: string;
  roll: () => Promisable<RRLogEntryDiceRoll["payload"] | null>;
}) {
  const myId = useMyProps("id").id;
  const dispatch = useServerDispatch();
  return (
    <a
      href="#"
      onClick={async (e) => {
        e.preventDefault();
        const dice = await roll();
        if (dice === null) {
          return;
        }
        dispatch(
          logEntryDiceRollAdd({
            playerId: myId,
            silent: false,
            payload: dice,
          })
        );
      }}
    >
      {text}
    </a>
  );
}

function RollScaledLink({
  args,
  isDamage,
  spell,
}: {
  args: string;
  isDamage: boolean;
  spell: CompendiumSpell;
}) {
  const [baseDiceString, levelRange, diceStringPerLevel] = args.split("|");
  const baseDiceStrings = baseDiceString?.split(";");

  if (
    baseDiceStrings === undefined ||
    !baseDiceStrings.every((baseDiceString) =>
      isValidDiceString(baseDiceString)
    )
  ) {
    throw new Error(`Can not parse dice expression: ${String(baseDiceString)}`);
  }
  if (
    diceStringPerLevel === undefined ||
    !isValidDiceString(diceStringPerLevel)
  ) {
    throw new Error(
      `Can not parse dice expression: ${String(diceStringPerLevel)}`
    );
  }
  if (levelRange === undefined) {
    throw new Error(`Can not parse level range: ${String(levelRange)}`);
  }

  // The level range is either in the format 5-8 or 5,7,9. The latter is used
  // for spells where heightening by just one level has no effect.
  function parseLevels(levelRange: string) {
    let levels: number[] = [];

    const match = /^(\d+)-(\d+)$/.exec(levelRange);
    if (match === null) {
      levels = levelRange.split(",").map((level) => {
        assertIsInteger(level);
        return parseInt(level, 10);
      });
    } else {
      if (match.length !== 3) {
        throw new Error(`Can not parse level range: ${String(levelRange)}`);
      }
      assertIsInteger(match[1]!);
      assertIsInteger(match[2]!);
      const baseLevel = parseInt(match[1]!, 10);
      const endLevel = parseInt(match[2]!, 10);
      for (let level = baseLevel; level <= endLevel; level++) {
        levels.push(level);
      }
    }

    return levels;
  }

  const levels = parseLevels(levelRange);
  const prompt = usePrompt();

  return (
    <RollLink
      text={diceStringPerLevel}
      roll={async () => {
        let baseDiceString;
        if (baseDiceStrings.length > 1) {
          const idx =
            parseInt(
              (
                await prompt(
                  `What is the base roll you are trying to heighten? Type a number corresponding to the base roll (${baseDiceStrings
                    .map((diceString, idx) => `${idx + 1} = ${diceString}`)
                    .join(", ")})`
                )
              )?.trim() ?? ""
            ) - 1;
          if (isNaN(idx) || idx < 0 || idx >= baseDiceStrings.length) {
            return null;
          }
          baseDiceString = baseDiceStrings[idx]!;
        } else {
          baseDiceString = baseDiceStrings[0]!;
        }

        const levelString =
          (
            await prompt(
              `At which level do you want to cast the spell (possible levels: ${levelRange})?`
            )
          )?.trim() ?? null;
        if (levelString === null) {
          return null;
        }

        const level = parseInt(levelString, 10);
        const levelIndex = levels.indexOf(level);
        if (levelIndex === -1) {
          return null;
        }

        let diceString = baseDiceString;
        for (let i = 0; i < levelIndex; i++) {
          diceString += ` + ${diceStringPerLevel}`;
        }

        return {
          diceRollTree: parseDiceStringAndRoll(diceString),
          rollType: isDamage ? "hit" : null,
          rollName: `${spell.name} (level ${level})`,
        };
      }}
    />
  );
}

function TextEntryString({
  text,
  spell,
}: {
  text: string;
  spell: CompendiumSpell;
}) {
  return (
    <>
      {Array.from(getPartsFromTextEntryString(text)).map((part, key) => {
        if (!(part.startsWith("{") && part.endsWith("}"))) {
          return part;
        }

        const content = part.substring(1, part.length - 1);
        if (!content.startsWith("@")) {
          throw new Error(`Unexpected command, got ${part}`);
        }
        const idx = content.indexOf(" ");
        const command = content.substring(1, idx);
        const args = content.substring(idx + 1);

        switch (command) {
          case "dice":
          case "damage": {
            const [diceString, displayString] = args.split("|");
            if (
              !diceString ||
              (process.env.NODE_ENV !== "production" &&
                !isValidDiceString(diceString))
            ) {
              console.error(spell.name);
              throw new Error(
                `Can not parse dice expression: ${String(diceString)}`
              );
            }
            return (
              <RollLink
                key={key}
                text={displayString ?? diceString}
                roll={() => ({
                  diceRollTree: parseDiceStringAndRoll(diceString),
                  rollType: command === "damage" ? "attack" : null,
                  rollName: spell.name,
                })}
              />
            );
          }
          case "scaleDice":
          case "scaleDamage":
            return (
              <RollScaledLink
                key={key}
                args={args}
                isDamage={command === "scaleDamage"}
                spell={spell}
              />
            );
          case "hit":
          case "d20": {
            assertIsInteger(args);
            const modifier = parseInt(args);
            const damage = { type: null };
            return (
              <RollLink
                key={key}
                text={formatModifier(modifier)}
                roll={() => ({
                  diceRollTree: {
                    type: "term",
                    operator: "+",
                    operands: [
                      roll({
                        faces: 20,
                        count: 1,
                        damage,
                      }),
                      {
                        type: "num",
                        value: modifier,
                        damage,
                      },
                    ],
                  },
                  rollType: command === "hit" ? "attack" : null,
                  rollName: spell.name,
                })}
              />
            );
          }
          case "chance": {
            assertIsInteger(args);
            const winPercentage = parseInt(args);
            return <em key={key}>{winPercentage} percent</em>;
          }
          case "note":
            return (
              <React.Fragment key={key}>
                <br />
                <em>
                  Note: <TextEntryString text={args} spell={spell} />
                </em>
                <br />
                <br />
              </React.Fragment>
            );
          case "race": {
            // When the race id is different than the race label to display, then
            // the label comes after ||.
            const race = args.split("||");
            return <em key={key}>{race[race.length - 1]}</em>;
          }
          // TODO: We should also handle these properly.
          case "spell":
          case "condition":
          case "sense":
          case "classFeature":
          case "creature":
          case "item":
          case "action":
          case "skill":
          case "filter":
          case "book":
            return part;
          default:
            throw new Error(`Unexpected command, got ${part}`);
        }
      })}
    </>
  );
}

function TextEntry({
  entry,
  spell,
}: {
  entry: CompendiumTextEntry;
  spell: CompendiumSpell;
}) {
  if (typeof entry === "string") {
    return (
      <p>
        <TextEntryString text={entry} spell={spell} />
      </p>
    );
  }

  switch (entry.type) {
    case "entries": {
      return (
        <div>
          <p>
            <strong>{entry.name}</strong>
          </p>
          {entry.entries.map((each, i) => (
            <TextEntry key={i} entry={each} spell={spell} />
          ))}
        </div>
      );
    }

    case "list": {
      return (
        <ul>
          {entry.items.map((each, i) => (
            <li key={i}>
              <TextEntry entry={each} spell={spell} />
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
                      <TextEntry entry={cell} spell={spell} />
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
