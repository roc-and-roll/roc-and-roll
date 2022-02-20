import React, { useEffect, useState } from "react";
import { RRID } from "../../shared/state";
import { rrid } from "../../shared/util";
import { useAlert } from "../dialog-boxes";
import { useLatest } from "../useLatest";
import useLocalState from "../useLocalState";
import { useCompendium } from "./compendium/Compendium";
import {
  CompendiumSource,
  isCompendiumSource,
} from "../../shared/compendium-types";
import { Button } from "./ui/Button";
import type * as z from "zod";

export function Modding() {
  return (
    <div className="modding">
      <div className="modding-warning">
        <strong>Warning</strong> Only execute mods from trusted sources. These
        mods have full access to all of the game data.
      </div>

      <OneOffMod />
    </div>
  );
}

function OneOffMod() {
  const [script, setScript] = useLocalState("one-off-mod", "");
  const [executing, setExecuting] = useState(false);
  const alert = useAlert();

  async function execute() {
    try {
      setExecuting(true);
      console.log(await eval(script));
    } catch (err) {
      await alert(String(err));
    } finally {
      setExecuting(false);
    }
  }

  return (
    <>
      <h4>Execute one-off Mod Script</h4>
      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder="JavaScript Code..."
        disabled={executing}
        rows={20}
      />
      <Button onClick={execute} disabled={executing}>
        execute
      </Button>
      {executing && "running..."}
    </>
  );
}

export interface MODDING {
  rrid: () => RRID;
  compendium: {
    addSource: (source: CompendiumSource) => z.ZodError | null;
    getSources: () => CompendiumSource[];
  };
}

export function ModApi() {
  const { sources: compendiumSources, addSource: addCompendiumSource } =
    useCompendium();
  const compendiumSourcesRef = useLatest(compendiumSources);

  useEffect(() => {
    const modInterface: MODDING = {
      rrid,
      compendium: {
        addSource: (source: unknown) => {
          const validationResult = isCompendiumSource.safeParse(source);
          if (validationResult.success) {
            addCompendiumSource(validationResult.data);
            return null;
          }
          return validationResult.error;
        },
        getSources: (): CompendiumSource[] => {
          return compendiumSourcesRef.current;
        },
      },
    };

    window.MODDING = modInterface;
    return () => {
      delete window.MODDING;
    };
  }, [compendiumSourcesRef, addCompendiumSource]);

  return null;
}
