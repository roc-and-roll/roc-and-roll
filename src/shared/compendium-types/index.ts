// NOTE: This folder is located in shared/ because its compilation is slow, not
// because it is actually supposed to be used on the server!
import * as z from "zod";
import { assert, IsExact } from "conditional-type-checks";
import { isRRID } from "../validation";
import { MakeRRID } from "../state";
import { CompendiumSpell, isSpell } from "./spell";
import { CompendiumMonster, isMonster } from "./monster";

export const isCompendiumData = z.strictObject({
  spell: z.array(isSpell),
  monster: z.optional(z.array(isMonster)),
});

export interface CompendiumData {
  spell: CompendiumSpell[];
  monster?: CompendiumMonster[];
}

// Make sure that the schema really matches the CompendiumData type.
assert<IsExact<z.infer<typeof isCompendiumData>, CompendiumData>>(true);

export type CompendiumSourceID = MakeRRID<"compendiumSource">;

export interface CompendiumSource {
  id: CompendiumSourceID;
  title: string;
  meta: string;
  data: CompendiumData;
}

export const isCompendiumSource = z.strictObject({
  id: isRRID<CompendiumSourceID>(),
  title: z.string(),
  meta: z.string(),
  data: isCompendiumData,
});

// Make sure that the schema really matches the TextEntry type.
assert<IsExact<z.infer<typeof isCompendiumSource>, CompendiumSource>>(true);
