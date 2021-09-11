import React, { useCallback, useContext } from "react";
import { rrid } from "../../../shared/util";
import { useAlert } from "../../popup-boxes";
import { useGuranteedMemo } from "../../useGuranteedMemo";
import useLocalState from "../../useLocalState";
import { Button } from "../ui/Button";
import {
  CompendiumSource,
  CompendiumSourceID,
  isCompendiumData,
} from "./types";

const CompendiumContext = React.createContext<{
  sources: CompendiumSource[];
  addSource: (source: CompendiumSource) => void;
  removeSource: (sourceId: CompendiumSourceID) => void;
}>({
  sources: [],
  addSource: () => {},
  removeSource: () => {},
});

export function CompendiumProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sources, setSources] = useLocalState<CompendiumSource[]>(
    "compendium",
    []
  );

  const addSource = useCallback(
    (source: CompendiumSource) => {
      setSources((sources) => [...sources, source]);
    },
    [setSources]
  );

  const removeSource = useCallback(
    (sourceId: CompendiumSourceID) => {
      setSources((sources) =>
        sources.filter((source) => source.id !== sourceId)
      );
    },
    [setSources]
  );

  const ctx = useGuranteedMemo(
    () => ({
      sources,
      addSource,
      removeSource,
    }),
    [sources, addSource, removeSource]
  );

  return (
    <CompendiumContext.Provider value={ctx}>
      {children}
    </CompendiumContext.Provider>
  );
}

export function useCompendium() {
  return useContext(CompendiumContext);
}

export function Compendium() {
  const { sources, addSource, removeSource } = useCompendium();
  const alert = useAlert();

  return (
    <>
      <p>
        Press <kbd>SHIFT</kbd> twice to open the quick reference.
      </p>
      <ul>
        <li>
          <p>upload new source</p>
          <input
            type="file"
            multiple
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              const jsons = await Promise.all(
                files.map(async (file) => {
                  try {
                    const json = JSON.parse(await file.text());
                    return [file.name, json] as const;
                  } catch (err) {
                    await alert(
                      `Error while parsing json in file ${
                        file.name
                      }\n\n${String(err)}`
                    );
                    throw err;
                  }
                })
              );

              await Promise.all(
                jsons.map(async ([fileName, json]) => {
                  const errors: string[] = [];
                  if (isCompendiumData(json, { errors })) {
                    addSource({
                      id: rrid<CompendiumSource>(),
                      title: fileName,
                      data: json,
                      meta: "",
                    });
                  } else {
                    console.error({ json, errors });
                    await alert(
                      `Invalid data in file ${fileName}\n\n` + errors.join("\n")
                    );
                  }
                })
              );
            }}
          />
        </li>
        {sources.map((source, i) => (
          <li key={i}>
            <p>{source.title}</p>
            <p>Spells: {source.data.spell.length}</p>
            <Button onClick={() => removeSource(source.id)}>remove</Button>
          </li>
        ))}
      </ul>
    </>
  );
}
