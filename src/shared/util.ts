export function isObject(item: any): item is Record<string, any> {
  return item && typeof item === "object" && !Array.isArray(item);
}

export function mergeDeep<T>(base: any, patch: any): T {
  if (!isObject(base)) {
    return patch;
  }
  const output = { ...base };
  if (isObject(patch)) {
    Object.keys(patch).forEach((key) => {
      if (isObject(patch[key])) {
        if (!(key in base)) {
          Object.assign(output, { [key]: patch[key] });
        } else {
          output[key] = mergeDeep(base[key], patch[key]);
        }
      } else {
        Object.assign(output, {
          [key]: patch[key],
        });
      }
    });
  }
  return output as T;
}
