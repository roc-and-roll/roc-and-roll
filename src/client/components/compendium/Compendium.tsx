import React, { useCallback, useContext } from "react";
import { rrid } from "../../../shared/util";
import { useAlert } from "../../dialog-boxes";
import useLocalState from "../../useLocalState";
import { FileInput } from "../FileInput";
import { Button } from "../ui/Button";
import {
  CompendiumSource,
  CompendiumSourceID,
  isCompendiumData,
} from "../../../shared/compendium-types/index";
import sjson from "secure-json-parse";
import { useGuaranteedMemo } from "../../useGuaranteedMemo";

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
      setSources((sources) => {
        console.log(sources);
        return sources.filter((source) => source.id !== sourceId);
      });
    },
    [setSources]
  );

  const ctx = useGuaranteedMemo(
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
          <label>
            upload new source:{" "}
            <FileInput
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                const fileContents = await Promise.all(
                  files.map(async (file) => {
                    try {
                      const json = sjson.parse(await file.text());
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
                  fileContents.map(async ([fileName, json]) => {
                    const validationResult = isCompendiumData.safeParse(json);
                    if (validationResult.success) {
                      addSource({
                        id: rrid<CompendiumSource>(),
                        title: fileName,
                        data: validationResult.data,
                        meta: "",
                      });
                    } else {
                      console.error({ json, error: validationResult.error });
                      await alert(
                        `Invalid data in file ${fileName}\n\n` +
                          validationResult.error.message
                      );
                    }
                  })
                );
              }}
            />
          </label>
        </li>
        {sources.map((source, i) => (
          <li key={i}>
            <p>{source.title}</p>
            {source.data.spell && <p>Spells: {source.data.spell.length}</p>}
            {source.data.monster && (
              <p>Monsters: {source.data.monster.length}</p>
            )}
            {source.data.legendaryGroups && (
              <p>Legendary Groups: {source.data.legendaryGroups.length}</p>
            )}
            <Button onClick={() => removeSource(source.id)}>remove</Button>
          </li>
        ))}
      </ul>
    </>
  );
}
