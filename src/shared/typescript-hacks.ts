// TypeScript hack to avoid inlining.
// https://github.com/microsoft/TypeScript/issues/34119
export type ForceNoInlineHelper<T> = T;
