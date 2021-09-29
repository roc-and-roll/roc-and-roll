import Tippy, { TippyProps } from "@tippyjs/react";
import React from "react";
import "tippy.js/dist/tippy.css";

export type RRTooltipProps = Pick<
  TippyProps,
  "content" | "placement" | "offset" | "children" | "disabled"
>;

export function RRTooltip(props: RRTooltipProps) {
  return <Tippy {...props} />;
}
