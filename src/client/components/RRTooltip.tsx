import Tippy, { TippyProps } from "@tippyjs/react";
import React from "react";
import "tippy.js/dist/tippy.css";

export type RRTooltipProps = Pick<
  TippyProps,
  "content" | "placement" | "offset" | "children" | "disabled"
>;

export const RRTooltip = React.forwardRef<Element, RRTooltipProps>(
  function RRTooltip(props, ref) {
    return <Tippy ref={ref} {...props} />;
  }
);
