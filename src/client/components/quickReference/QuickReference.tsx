import { matchSorter } from "match-sorter";
import React, { useContext, useDeferredValue, useMemo } from "react";
import { useEffect, useRef } from "react";
import { Promisable } from "type-fest";
import { logEntryDiceRollAdd } from "../../../shared/actions";
import { CompendiumTextEntry } from "../../../shared/compendium-types/text-entry";
import { CompendiumMonster } from "../../../shared/compendium-types/monster";
import { CompendiumSpell } from "../../../shared/compendium-types/spell";
import { conditionTooltip, RRLogEntryDiceRoll } from "../../../shared/state";
import { usePrompt } from "../../dialog-boxes";
import {
  roll,
  parseDiceStringAndRoll,
  isValidDiceString,
} from "../../dice-rolling/roll";
import { useMyProps } from "../../myself";
import { useServerDispatch } from "../../state";
import { useCompendium } from "../compendium/Compendium";
import { Dialog, DialogContent, DialogTitle } from "../Dialog";
import { SmartTextInput } from "../ui/TextInput";
import "./QuickReference.scss";
import { Monster } from "./QuickReferenceMonster";
import { Spell } from "./QuickReferenceSpell";
import { QuickReferenceContext } from "./QuickReferenceWrapper";

export default function QuickReference({ onClose }: { onClose?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { setOpen, searchString, setSearchString } = useContext(
    QuickReferenceContext
  );
  const deferredSearch = useDeferredValue(searchString);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <Dialog
      open
      onClose={() => {
        setOpen(false);
        setSearchString("");
        if (onClose) {
          onClose();
        }
      }}
      className="quick-reference-modal"
    >
      <DialogTitle>Quick Reference</DialogTitle>
      <SmartTextInput
        type="search"
        placeholder="Search..."
        ref={inputRef}
        value={searchString}
        onChange={(search) => setSearchString(search)}
      />
      <DialogContent>
        <Content
          search={deferredSearch}
          searchIsStale={searchString !== deferredSearch}
        />
      </DialogContent>
    </Dialog>
  );
}

function isSpell(
  obj: CompendiumMonster | CompendiumSpell
): obj is CompendiumSpell {
  return "components" in obj;
}

function Content({
  search,
  searchIsStale,
}: {
  search: string;
  searchIsStale: boolean;
}) {
  const { sources: compendiumSources } = useCompendium();

  const results = useMemo(
    () =>
      matchSorter(
        [
          ...compendiumSources.flatMap((source) => source.data.spell ?? []),
          ...compendiumSources.flatMap((source) => source.data.monster ?? []),
        ],
        search,
        { keys: ["name"] }
      ),
    [compendiumSources, search]
  );

  if (search.length < 3) return null;

  return (
    <ul style={searchIsStale ? { opacity: 0.7 } : {}}>
      {results.map((result: CompendiumSpell | CompendiumMonster) => (
        <li key={result.name} className="even:bg-neutral-600 p-3">
          {isSpell(result) ? (
            <Spell spell={result} />
          ) : (
            <Monster monster={result} />
          )}
        </li>
      ))}
    </ul>
  );
}

export function stndrdth(number: number) {
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

export function capitalize(string: string) {
  return `${string.slice(0, 1).toUpperCase()}${string.slice(1)}`;
}

export function pluralizeIfNeeded(value: number, unit: string) {
  if (value === 1) {
    return unit;
  }
  return `${unit}s`;
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

function CompendiumLink({
  text,
  searchString,
}: {
  text: string;
  searchString: string;
}) {
  const { setOpen, setSearchString } = useContext(QuickReferenceContext);
  return (
    <a
      href="#"
      onClick={(event) => {
        event.preventDefault();
        setOpen(true);
        setSearchString(searchString);
      }}
    >
      {text}
    </a>
  );
}

function RollScaledLink({
  args,
  isDamage,
  rollName,
}: {
  args: string;
  isDamage: boolean;
  rollName: string;
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
          rollName: `${rollName} (level ${level})`,
          tooltip: null,
          characterIds: null,
        };
      }}
    />
  );
}

export function TextEntryString({
  text,
  rollName,
}: {
  text: string;
  rollName: string;
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

        let command: string;
        let args: string;
        if (idx !== -1) {
          command = content.substring(1, idx);
          args = content.substring(idx + 1);
        } else {
          command = content.substring(1);
          args = "";
        }

        switch (command) {
          case "dice":
          case "damage": {
            const [diceString, displayString] = args.split("|");
            if (
              !diceString ||
              (process.env.NODE_ENV !== "production" &&
                !isValidDiceString(diceString))
            ) {
              console.log(
                `Could not parse dice expression: ${String(diceString)}`
              );
              return <>{diceString && " " + diceString + " "}</>;
              //throw new Error(
              //`Can not parse dice expression: ${String(diceString)}`
              //);
            }
            return (
              <RollLink
                key={key}
                text={displayString ?? diceString}
                roll={() => ({
                  diceRollTree: parseDiceStringAndRoll(diceString),
                  rollType: command === "damage" ? "attack" : null,
                  rollName,
                  tooltip: null,
                  characterIds: null,
                })}
              />
            );
          }
          //cspell: disable
          case "scaledice":
          case "scaledamage":
            return (
              <RollScaledLink
                key={key}
                args={args}
                isDamage={command === "scaledamage"}
                rollName={rollName}
              />
            );
          //cspell: enable
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
                  rollName,
                  tooltip: null,
                  characterIds: null, // TODO
                })}
              />
            );
          }
          case "chance": {
            const [_chance, chanceString] = args.split("|");
            return <em key={key}>{chanceString}</em>;
          }
          case "note":
            return (
              <React.Fragment key={key}>
                <br />
                <em>
                  Note: <TextEntryString text={args} rollName={rollName} />
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
          case "atk": {
            let attackString = "";
            if (args === "mw") attackString = "Melee Weapon Attack";
            else if (args === "rw") attackString = "Ranged Weapon Attack";
            else if (args === "ms") attackString = "Melee Spell Attack";
            else if (args === "rs") attackString = "Ranged Spell Attack";
            else if (args === "mw,rw")
              attackString = "Melee or Ranged Weapon Attack";
            else if (attackString === "")
              console.log("Unexpected attack type: " + args);

            return <em key={key}>{attackString}</em>;
          }
          case "h": {
            return <em key={key}>Hit: </em>;
          }
          case "spell":
          case "creature": {
            const [text, label] = args.split("||");
            return (
              <CompendiumLink
                key={key}
                searchString={text!}
                text={(label ?? text!)
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              ></CompendiumLink>
            );
          }
          case "condition":
            return (
              <span
                key={key}
                className="underline"
                title={conditionTooltip(args)}
              >
                {args}
              </span>
            );
          case "dc":
            return "DC " + args;
          // TODO: We should also handle these properly.
          // cspell:disable-next-line
          case "quickref":
          case "sense":
          case "classFeature":
          case "item":
          case "action":
          case "skill":
          case "filter":
          case "book":
          case "i":
          case "hitYourSpellAttack":
            return part;
          default:
            throw new Error(`Unexpected command, got ${part}`);
        }
      })}
    </>
  );
}

export function TextEntry({
  entry,
  rollName,
}: {
  entry: CompendiumTextEntry;
  rollName: string;
}) {
  if (typeof entry === "string") {
    return (
      <p>
        <TextEntryString text={entry} rollName={rollName} />
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
            <TextEntry key={i} entry={each} rollName={rollName} />
          ))}
        </div>
      );
    }

    case "list": {
      return (
        <ul>
          {entry.items.map((each, i) => (
            <li key={i}>
              <TextEntry entry={each} rollName={rollName} />
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
                      <TextEntry entry={cell} rollName={rollName} />
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

    case "inset": {
      return (
        <div className="m-2 p-2 border-2 border-white">
          <p className="font-bold">{entry.name}</p>
          {entry.entries.map((insetEntry, index) => {
            return (
              <TextEntry key={index} entry={insetEntry} rollName={rollName} />
            );
          })}
          <div className="text-sm text-right">
            {entry.source} on page {entry.page}
          </div>
        </div>
      );
    }

    case "item": {
      return (
        <div>
          <p className="font-bold">{entry.name}</p>
          {(entry.entry ? [entry.entry] : entry.entries ?? []).map(
            (nestedEntry, index) => (
              <TextEntry key={index} entry={nestedEntry} rollName={rollName} />
            )
          )}
        </div>
      );
    }
  }
}
