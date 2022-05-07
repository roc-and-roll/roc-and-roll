import React, { Suspense, useContext, useTransition } from "react";
import { useEffect, useRef, useState } from "react";
import { useGuaranteedMemo } from "../../useGuaranteedMemo";
import { isTriggeredByTextInput } from "../../util";

const QuickReference = React.lazy(() => import("./QuickReference"));

export const QuickReferenceContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  searchString: string;
  setSearchString: (term: string) => void;
}>({
  open: false,
  setOpen: () => {},
  searchString: "",
  setSearchString: () => {},
});

export function QuickReferenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [searchString, setSearchString] = useState("");

  const ctx = useGuaranteedMemo(
    () => ({
      open: open,
      setOpen: setOpen,
      searchString: searchString,
      setSearchString: setSearchString,
    }),
    [open, searchString]
  );
  return (
    <QuickReferenceContext.Provider value={ctx}>
      {children}
    </QuickReferenceContext.Provider>
  );
}

export default function QuickReferenceWrapper() {
  const { open, setOpen, setSearchString } = useContext(QuickReferenceContext);
  const lastShiftPressRef = useRef(0);
  const [_, startTransition] = useTransition();

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setSearchString("");
        setOpen(false);
        return;
      }

      if (isTriggeredByTextInput(e)) return;

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
  }, [open, setOpen, setSearchString]);

  return open ? (
    <Suspense fallback={null}>
      <QuickReference />
    </Suspense>
  ) : null;
}
