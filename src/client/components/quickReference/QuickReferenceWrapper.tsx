import React, { Suspense } from "react";
import { useEffect, useRef, useState } from "react";

const QuickReference = React.lazy(() => import("./QuickReference"));

export default function QuickReferenceWrapper() {
  const [open, setOpen] = useState(false);
  const lastShiftPressRef = useRef(0);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        if (lastShiftPressRef.current !== 0) {
          if (Date.now() - lastShiftPressRef.current < 200) {
            setOpen((open) => !open);
          }
        }
        lastShiftPressRef.current = Date.now();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return open ? (
    <Suspense fallback={null}>
      <QuickReference onClose={() => setOpen(false)} />
    </Suspense>
  ) : null;
}
