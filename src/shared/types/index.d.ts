declare const __VERSION__: string;

declare module "!!raw-loader!*" {
  const contents: string;
  export = contents;
}

declare module "*.css" {
  const classNames: Record<string, string>;
  export = classNames;
}

declare module "*.scss" {
  const classNames: Record<string, string>;
  export = classNames;
}

declare module "*.mp3" {
  const mp3: string;
  export = mp3;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: "development" | "production" | "test";
    readonly HEROKU?: string;
  }
}
