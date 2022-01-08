import {
  faCircle,
  faSquare,
  faUserFriends,
  faUsers,
  faUser,
  faPlusCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React from "react";
import {
  characterTemplateUpdate,
  characterUpdate,
} from "../../../shared/actions";
import { randomColor } from "../../../shared/colors";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import { RRAura, RRCharacter } from "../../../shared/state";
import { useServerDispatch } from "../../state";
import { Button } from "../ui/Button";
import { ColorInput } from "../ui/ColorInput";

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

  function updateShape(
    shape: "circle" | "square",
    index: number,
    aura: RRAura
  ) {
    setAuras([
      ...character.auras.slice(0, index),
      { ...aura, shape },
      ...character.auras.slice(index + 1),
    ]);
  }

  function updateVisibility(
    visibility: "everyone" | "playerAndGM" | "playerOnly",
    index: number,
    aura: RRAura
  ) {
    setAuras([
      ...character.auras.slice(0, index),
      { ...aura, visibility },
      ...character.auras.slice(index + 1),
    ]);
  }

  function updateSize(size: number, index: number, aura: RRAura) {
    setAuras([
      ...character.auras.slice(0, index),
      { ...aura, size: size },
      ...character.auras.slice(index + 1),
    ]);
  }

  return (
    <>
      {character.auras.map((aura, i) => (
        <div key={i}>
          <div>
            <label>
              Size in feet{" "}
              <input
                type="number"
                min={0}
                value={aura.size}
                onChange={(e) => updateSize(e.target.valueAsNumber, i, aura)}
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
            <p>Shape </p>
            <Button
              className={clsx(aura.shape === "circle" ? "aura-active" : "")}
              onClick={() => updateShape("circle", i, aura)}
            >
              <FontAwesomeIcon icon={faCircle} />
            </Button>
            <Button
              className={clsx(aura.shape === "square" ? "aura-active" : "")}
              onClick={() => updateShape("square", i, aura)}
            >
              <FontAwesomeIcon icon={faSquare} />
            </Button>
          </div>
          <div>
            <p>Visibility</p>
            <Button
              title="Everyone"
              className={clsx(
                aura.visibility === "everyone" ? "aura-active" : ""
              )}
              onClick={() => updateVisibility("everyone", i, aura)}
            >
              <FontAwesomeIcon icon={faUsers} />
            </Button>
            <Button
              title="You and the GM"
              className={clsx(
                aura.visibility === "playerAndGM" ? "aura-active" : ""
              )}
              onClick={() => updateVisibility("playerAndGM", i, aura)}
            >
              <FontAwesomeIcon icon={faUserFriends} />
            </Button>
            <Button
              title="Only you"
              className={clsx(
                aura.visibility === "playerOnly" ? "aura-active" : ""
              )}
              onClick={() => updateVisibility("playerOnly", i, aura)}
            >
              <FontAwesomeIcon icon={faUser} />
            </Button>
          </div>
          {/*
            <div>
              <label>
                Visible when{" "}
                <Select
                  value={aura.visibleWhen}
                  onChange={(visibleWhen) => {
                    setAuras([
                      ...character.auras.slice(0, i),
                      {
                        ...aura,
                        visibleWhen,
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
            Delete Aura
          </Button>
          <hr className="mb-0" />
        </div>
      ))}
      <Button
        className="w-16 block my-0 mx-auto"
        onClick={() => {
          setAuras((old) => [
            ...old,
            {
              color: randomColor(),
              shape: "circle",
              size: 10,
              visibleWhen: "always",
              visibility: "everyone",
            },
          ]);
        }}
      >
        <FontAwesomeIcon icon={faPlusCircle} />
      </Button>
    </>
  );
}
