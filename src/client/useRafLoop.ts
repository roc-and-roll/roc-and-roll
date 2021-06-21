import { useCallback, useEffect, useRef } from "react";
import { clamp } from "../shared/util";

export default function useRafLoop() {
  const rafFrameId = useRef<number | null>(null);
  const rafCallback = useRef<{
    callback: (delta: number) => void;
    duration: number;
    start: number;
  } | null>(null);

  const step = useCallback((time: number) => {
    if (rafCallback.current) {
      const delta = clamp(
        0,
        (time - rafCallback.current.start) / rafCallback.current.duration,
        1
      );
      rafCallback.current.callback(delta);
      if (delta < 1) {
        rafFrameId.current = requestAnimationFrame(step);
      } else {
        rafCallback.current = null;
        rafFrameId.current = null;
      }
    }
  }, []);

  const result = useRef([
    // start
    (callback: (amount: number) => void, duration: number) => {
      if (!rafCallback.current) {
        rafCallback.current = { callback, duration, start: performance.now() };
        rafFrameId.current = requestAnimationFrame(step);
      }
    },
    // stop
    () => {
      if (rafCallback.current) {
        rafCallback.current = null;
        if (rafFrameId.current !== null) {
          cancelAnimationFrame(rafFrameId.current);
        }
        return true;
      } else {
        return false;
      }
    },
    // isActive
    (): boolean => !!rafCallback.current,
  ] as const);

  useEffect(() => {
    // cancel the animation if the component unmounts
    const stop = result.current[1];
    return () => {
      stop();
    };
  }, []);

  return result.current;
}
