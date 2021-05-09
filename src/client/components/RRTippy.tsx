import React from "react";
import Tippy, { TippyProps } from "@tippyjs/react";
import "./Popover.scss";
import "tippy.js/animations/scale-subtle.css";

// From https://gist.github.com/atomiks/520f4b0c7b537202a23a3059d4eec908
//
// Will only render the `content` or `render` elements if the tippy is mounted
// to the DOM
export default function RRTippy(props: TippyProps) {
  const [mounted, setMounted] = React.useState(false);

  const lazyPlugin = {
    fn: () => ({
      onMount: () => setMounted(true),
      onHidden: () => setMounted(false),
    }),
  };

  const computedProps = { ...props };

  computedProps.plugins = [lazyPlugin, ...(props.plugins || [])];

  if (props.render) {
    const render = props.render;
    computedProps.render = (...args) => (mounted ? render(...args) : "");
  } else {
    computedProps.content = mounted ? props.content : "";
  }

  const onClickOutside = props.onClickOutside;
  if (onClickOutside) {
    computedProps.onClickOutside = (instance, e) => {
      let element = e.target as HTMLElement | null;
      while (element) {
        if (element.attributes.getNamedItem("data-tippy-root")) {
          return;
        }
        element = element.parentElement;
      }
      return onClickOutside(instance, e);
    };
  }

  return <Tippy {...computedProps} />;
}
