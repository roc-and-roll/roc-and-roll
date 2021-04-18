import { useEffect, useState } from "react";

export function useIsTabFocused() {
  const [focused, setFocused] = useState(document.hasFocus());

  useEffect(() => {
    // FIXME: Instead of registering an event callback for every consumer of
    // this hook, we should only register a single global callback.
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return focused;
}
