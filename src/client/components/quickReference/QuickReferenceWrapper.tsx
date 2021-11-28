import React, { Suspense, useTransition } from "react";
import { useEffect, useRef, useState } from "react";
import { isTriggeredByTextInput } from "../../util";

const QuickReference = React.lazy(() => import("./QuickReference"));

export default function QuickReferenceWrapper() {
  const [open, setOpen] = useState(false);
  const lastShiftPressRef = useRef(0);
  const [_, startTransition] = useTransition();

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (isTriggeredByTextInput(e)) {
        return;
      }

      if (
        e.key === "Shift" &&
        !e.repeat &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        if (lastShiftPressRef.current !== 0) {
          if (Date.now() - lastShiftPressRef.current < 400) {
            startTransition(() => setOpen(true));
          }
        }
        lastShiftPressRef.current = Date.now();
      }
    };
    const options = {
      capture: true,
      passive: true,
    };
    window.addEventListener("keyup", listener, options);
    return () => window.removeEventListener("keyup", listener, options);
  }, [startTransition]);

  return open ? (
    <Suspense fallback={null}>
      <QuickReference onClose={() => setOpen(false)} />
    </Suspense>
  ) : null;
}
