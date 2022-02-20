import * as z from "zod";
import { assert, IsExact } from "conditional-type-checks";
import { ForceNoInlineHelper } from "../typescript-hacks";

export type CompendiumTextEntry =
  | string
  | { type: "entries"; name: string; entries: CompendiumTextEntry[] }
  | { type: "list"; style?: string; items: CompendiumTextEntry[] }
  | {
      type: "table";
      caption?: string;
      colLabels: string[];
      colStyles: unknown[];
      rows: CompendiumTextEntry[][];
    }
  | {
      type: "cell";
      roll: { min: number; max: number; pad?: boolean } | { exact: number };
    }
  | {
      type: "inset";
      page: number;
      source: string;
      name: string;
      entries: CompendiumTextEntry[];
    }
  | {
      type: "item";
      name: string;
      entry?: CompendiumTextEntry;
      entries?: CompendiumTextEntry[];
      style?: string;
    };

const __isTextEntryRecursive: z.ZodSchema<CompendiumTextEntry> = z.lazy(
  () => isTextEntry
);

const _isTextEntry = z.union([
  z.string(),
  z.strictObject({
    type: z.literal("entries"),
    name: z.string(),
    entries: z.array(__isTextEntryRecursive),
  }),
  z.strictObject({
    type: z.literal("list"),
    style: z.optional(z.string()),
    items: z.array(__isTextEntryRecursive),
  }),
  z.strictObject({
    type: z.literal("table"),
    caption: z.optional(z.string()),
    colLabels: z.array(z.string()),
    colStyles: z.array(z.unknown()),
    rows: z.array(z.array(__isTextEntryRecursive)),
  }),
  z.strictObject({
    type: z.literal("cell"),
    roll: z.union([
      z.strictObject({
        exact: z.number().int().min(0),
      }),
      z.strictObject({
        min: z.number().int().min(0),
        max: z.number().int().min(0),
        pad: z.optional(z.boolean()),
      }),
    ]),
  }),
  z.strictObject({
    type: z.literal("inset"),
    page: z.number().int().min(0),
    source: z.string(),
    name: z.string(),
    entries: z.array(__isTextEntryRecursive),
  }),
  z.strictObject({
    type: z.literal("item"),
    name: z.string(),
    entry: z.optional(__isTextEntryRecursive),
    entries: z.optional(z.array(__isTextEntryRecursive)),
    style: z.optional(z.string()),
  }),
]);
// TypeScript hack to avoid inlining.
// https://github.com/microsoft/TypeScript/issues/34119
export interface _isTextEntryType
  extends ForceNoInlineHelper<typeof _isTextEntry> {}

export const isTextEntry: _isTextEntryType = _isTextEntry;

// Make sure that the schema really matches the TextEntry type.
assert<IsExact<z.infer<typeof isTextEntry>, CompendiumTextEntry>>(true);
