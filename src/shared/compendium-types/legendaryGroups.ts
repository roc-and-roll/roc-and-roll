import * as z from "zod";
import { assert, IsExact } from "conditional-type-checks";
import { ForceNoInlineHelper } from "../typescript-hacks";
import { CompendiumTextEntry, isTextEntry } from "./text-entry";

export interface CompendiumLegendaryGroup {
  name: string;
  source: string;
  lairActions?: Array<
    | string
    | { type: "list"; style?: string; items: CompendiumTextEntry[] }
    | {
        type: "entries";
        source: string;
        name: string;
        entries: CompendiumTextEntry[];
      }
  >;
  regionalEffects?: any;
  mythicEncounter?: any;
  _copy?: any;
  additionalSources?: any;
}

const _isLegendaryGroup = z.strictObject({
  name: z.string(),
  source: z.string(),
  lairActions: z.optional(
    z.array(
      z.union([
        z.string(), // is this actually a text entry?
        z.strictObject({
          type: z.literal("list"),
          style: z.optional(z.string()),
          items: z.array(isTextEntry),
        }),
        z.strictObject({
          type: z.literal("entries"),
          name: z.string(),
          source: z.string(),
          entries: z.array(isTextEntry),
        }),
      ])
    )
  ),
  regionalEffects: z.optional(z.any()),
  mythicEncounter: z.optional(z.any()),
  _copy: z.optional(z.any()),
  additionalSources: z.optional(z.any()),
});

// TypeScript hack to avoid inlining.
// https://github.com/microsoft/TypeScript/issues/34119
export interface _isLegendaryGroupType
  extends ForceNoInlineHelper<typeof _isLegendaryGroup> {}

export const isLegendaryGroup: _isLegendaryGroupType = _isLegendaryGroup;

// Make sure that the schema really matches the Spell type.
assert<IsExact<z.infer<typeof isLegendaryGroup>, CompendiumLegendaryGroup>>(
  true
);
