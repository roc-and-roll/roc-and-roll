import React, { useMemo } from "react";
import { rrid } from "../shared/util";

export function measureTime(measureName: string, fn: () => void) {
  if (process.env.NODE_ENV === "development") {
    const markerName = rrid();
    performance.mark(markerName);
    try {
      fn();
    } finally {
      performance.measure(measureName, markerName);
    }
  } else {
    fn();
  }
}

function getName(elementType: any): string | null {
  return (
    elementType.displayName ??
    elementType.name ??
    elementType.type?.name ??
    elementType.render?.name ??
    getName(
      (elementType._init as ((payload: any) => any) | undefined)?.(
        elementType._payload
      )
    ) ??
    elementType ??
    null
  );
}

export function use__DEBUG__getNameOfComponent() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const react = React;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useMemo(
    () =>
      getName(
        // @ts-ignore We'll all be fired now, I guess D:
        react.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
          .ReactCurrentOwner.current.elementType
      ),
    [react]
  );
}
