import React, { Suspense } from "react";
import type { TippyProps } from "@tippyjs/react";

// Load Tippy.js and Popper.js lazily to decrease the page load time and initial
// bundle size. Tooltips are not shown until Tippy.js is loaded.
const LazyTippy = React.lazy(() => import("./RRTippy"));

export function Popover({
  children,
  ...props
}: Pick<
  TippyProps,
  | "className"
  | "content"
  | "visible"
  | "onClickOutside"
  | "interactive"
  | "placement"
  | "children"
> & { children: NonNullable<React.ReactNode> }) {
  return (
    <Suspense fallback={children}>
      <LazyTippy
        {...props}
        appendTo={document.getElementsByClassName("root").item(0)!}
        animation="scale-subtle"
        theme="roc-and-roll"
      >
        {children}
      </LazyTippy>
    </Suspense>
  );
}
