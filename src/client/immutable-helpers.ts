export function mapAddImmutably<K, V>(map: Map<K, V>, key: K, value: V) {
  if (map.get(key) === value) {
    return map;
  }
  const newMap = new Map(map);
  newMap.set(key, value);
  return newMap;
}

export function mapDeleteImmutably<K, V>(map: Map<K, V>, key: K) {
  if (!map.has(key)) {
    return map;
  }
  const newMap = new Map(map);
  newMap.delete(key);
  return newMap;
}

export function setAddImmutably<V>(set: Set<V>, value: V) {
  if (set.has(value)) {
    return set;
  }
  const newSet = new Set(set);
  newSet.add(value);
  return newSet;
}

export function setDeleteImmutably<V>(set: Set<V>, value: V) {
  if (!set.has(value)) {
    return set;
  }
  const newSet = new Set(set);
  newSet.delete(value);
  return newSet;
}
