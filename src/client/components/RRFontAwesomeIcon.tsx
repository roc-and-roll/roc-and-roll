import {
  FontAwesomeIcon,
  FontAwesomeIconProps,
} from "@fortawesome/react-fontawesome";
import React from "react";

// FontAwesomeIcons do not accept a ref, but instead use the non-standard
// "forwardedRef" property. This is a simple wrapper that allows us to use
// them with the standard ref prop.
export const RRFontAwesomeIcon = React.forwardRef<
  HTMLOrSVGElement,
  Omit<FontAwesomeIconProps, "forwardedRef">
>(function RRFontAwesomeIcon(props, ref) {
  return <FontAwesomeIcon forwardedRef={ref} {...props} />;
});
