declare const __VERSION__: string;

declare module "!!raw-loader!*" {
  const contents: string;
  export = contents;
}

declare module "*.css" {
  const classNames: Record<string, string>;
  export = classNames;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: "development" | "production" | "test";
    readonly HEROKU?: string;
  }
}
