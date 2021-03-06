declare const __VERSION__: string;

declare const IMPORT_META_URL: string;

declare module "*.css" {
  const classNames: Record<string, string>;
  export = classNames;
}

declare module "*.scss" {
  const classNames: Record<string, string>;
  export = classNames;
}

declare module "*LICENSE.md" {
  const license: string;
  export = license;
}

declare module "*.mp3" {
  const mp3: string;
  export = mp3;
}

declare module "*.svg" {
  const svg: string;
  export = svg;
}

declare module "*.png" {
  const png: string;
  export = png;
}

declare module "*.jpg" {
  const jpg: string;
  export = jpg;
}

declare module "*.jpeg" {
  const jpeg: string;
  export = jpeg;
}

declare module "*.glb" {
  const glb: string;
  export = glb;
}

declare module "*.peggy" {
  const parser: import("peggy").Parser;
  export = parser;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV:
      | "development"
      | "production"
      | "test" // Jest unit tests
      | "e2e-test"; // Playwright end to end tests;
    readonly HEROKU?: string;
  }
}

interface Window {
  MODDING?: unknown;
}

// Make JSON and isArray checks return unknown instead of any.
//
// https://github.com/Microsoft/TypeScript/issues/26188#issuecomment-489659669
interface JSON {
  parse(
    text: string,
    reviver?: (this: unknown, key: string, value: unknown) => unknown
  ): unknown;

  stringify(
    text: unknown,
    replacer?: (this: unknown, key: string, value: unknown) => unknown,
    space?: string | number
  ): string;
}

interface Body {
  json(): Promise<unknown>;
}
