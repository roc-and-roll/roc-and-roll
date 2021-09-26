import React from "react";
import {
  characterTemplateUpdate,
  characterUpdate,
} from "../../../shared/actions";
import { randomColor } from "../../../shared/colors";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import { RRCharacter } from "../../../shared/state";
import { useServerDispatch } from "../../state";
import { Button } from "../ui/Button";
import { ColorInput } from "../ui/ColorInput";
import { Select } from "../ui/Select";

export function Auras({
  character,
  isTemplate,
}: {
  character: RRCharacter;
  isTemplate: boolean | undefined;
}) {
  const dispatch = useServerDispatch();
  const updateFunc = isTemplate ? characterTemplateUpdate : characterUpdate;

  const setAuras = (updater: React.SetStateAction<RRCharacter["auras"]>) =>
    dispatch((state) => {
      const oldAuras =
        state[isTemplate ? "characterTemplates" : "characters"].entities[
          character.id
        ]?.auras;

      if (oldAuras === undefined) {
        return [];
      }
      const newAuras =
        typeof updater === "function" ? updater(oldAuras) : updater;

      return {
        actions: [
          updateFunc({ id: character.id, changes: { auras: newAuras } }),
        ],
        optimisticKey: "auras",
        syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
      };
    });

  return (
    <ul>
      {character.auras.map((aura, i) => (
        <li key={i}>
          <div>
            <label>
              Size in feet{" "}
              <input
                type="number"
                min={0}
                value={aura.size}
                onChange={(e) => {
                  setAuras([
                    ...character.auras.slice(0, i),
                    { ...aura, size: e.target.valueAsNumber },
                    ...character.auras.slice(i + 1),
                  ]);
                }}
              />
            </label>
          </div>
          <div>
            <label>
              Color{" "}
              <ColorInput
                value={aura.color}
                onChange={(color) => {
                  setAuras([
                    ...character.auras.slice(0, i),
                    { ...aura, color },
                    ...character.auras.slice(i + 1),
                  ]);
                }}
              />
            </label>
          </div>
          <div>
            <label>
              Shape{" "}
              <Select
                value={aura.shape}
                onChange={(shape) => {
                  setAuras([
                    ...character.auras.slice(0, i),
                    { ...aura, shape },
                    ...character.auras.slice(i + 1),
                  ]);
                }}
                options={[
                  { value: "circle", label: "circle" },
                  { value: "square", label: "square" },
                ]}
              />
            </label>
          </div>
          <div>
            <label>
              Visible to{" "}
              <Select
                value={aura.visibility}
                options={[
                  { value: "everyone", label: "everyone" },
                  { value: "playerAndGM", label: "playerAndGM" },
                  { value: "playerOnly", label: "myself" },
                ]}
                onChange={(visibility) => {
                  setAuras([
                    ...character.auras.slice(0, i),
                    {
                      ...aura,
                      visibility,
                    },
                    ...character.auras.slice(i + 1),
                  ]);
                }}
              />
            </label>
          </div>
          {/*
            <div>
              <label>
                Visible when{" "}
                <Select
                  value={aura.visibileWhen}
                  onChange={(visibileWhen) => {
                    setAuras([
                      ...character.auras.slice(0, i),
                      {
                        ...aura,
                        visibileWhen,
                      },
                      ...character.auras.slice(i + 1),
                    ]);
                  }}
                  options={[
                    { value: "always", label: "always" },
                    { value: "onTurn", label: "on my turn" },
                    { value: "hover", label: "on hover" },
                  ]}
                />
              </label>
            </div>
            */}
          <Button
            className="red"
            onClick={() => {
              setAuras([
                ...character.auras.slice(0, i),
                ...character.auras.slice(i + 1),
              ]);
            }}
          >
            delete aura
          </Button>
        </li>
      ))}
      <li>
        <Button
          onClick={() => {
            setAuras((old) => [
              ...old,
              {
                color: randomColor(),
                shape: "circle",
                size: 10,
                visibileWhen: "always",
                visibility: "everyone",
              },
            ]);
          }}
        >
          add aura
        </Button>
      </li>
    </ul>
  );
}
