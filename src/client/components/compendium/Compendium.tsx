import React, { useCallback, useContext } from "react";
import { rrid } from "../../../shared/util";
import { useGuranteedMemo } from "../../useGuranteedMemo";
import useLocalState from "../../useLocalState";
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
                files.map(
                  async (file) =>
                    [
                      file.name,
                      JSON.parse(await file.text()) as unknown,
                    ] as const
                )
              );

              jsons.forEach(([fileName, json]) => {
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
                  alert("Invalid data");
                }
              });
            }}
          />
        </li>
        {sources.map((source, i) => (
          <li key={i}>
            <p>{source.title}</p>
            <p>Spells: {source.data.spell.length}</p>
            <button onClick={() => removeSource(source.id)}>remove</button>
          </li>
        ))}
      </ul>
    </>
  );
}
