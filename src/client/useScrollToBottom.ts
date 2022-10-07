import { useCallback, useLayoutEffect, useRef } from "react";

export function useScrollToBottom<T extends HTMLElement>(deps: unknown[] = []) {
  const scrollRef = useRef<T>(null);

  const scrollDownNow = useCallback(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, []);

  useLayoutEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
    // cspell: disable-next-line
    // eslint-disable-next-line @grncdr/react-hooks/exhaustive-deps
  }, deps);

  useLayoutEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      const scrollBottom = scrollElement.scrollTop + scrollElement.clientHeight;
      // we scroll down with new messages if the user is sufficiently close
      // enough to the bottom (150px)
      if (scrollElement.scrollHeight - scrollBottom < 150)
        scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  });

  return [scrollRef, scrollDownNow] as const;
}
