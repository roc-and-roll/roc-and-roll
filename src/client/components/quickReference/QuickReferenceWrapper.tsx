import React, { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { isTriggeredByTextInput } from "../../util";

const QuickReference = React.lazy(() => import("./QuickReference"));

export default function QuickReferenceWrapper() {
  const [open, setOpen] = useState(false);
  const lastShiftPressRef = useRef(0);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (isTriggeredByTextInput(e)) {
        return;
      }

      if (e.key === "Shift") {
        if (lastShiftPressRef.current !== 0) {
          if (Date.now() - lastShiftPressRef.current < 200) {
            setOpen((open) => !open);
          }
        }
        lastShiftPressRef.current = Date.now();
      }
    };
    window.addEventListener("keyup", listener, {
      capture: true,
      passive: true,
    });
    return () => window.removeEventListener("keyup", listener);
  }, []);

  return open ? (
    <Suspense fallback={null}>
      <QuickReference onClose={() => setOpen(false)} />
    </Suspense>
  ) : null;
}
