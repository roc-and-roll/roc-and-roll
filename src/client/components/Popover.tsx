import React from "react";
import Tippy, { TippyProps } from "@tippyjs/react";
import "./Popover.scss";
import "tippy.js/animations/scale-subtle.css";

export function Popover({
  children,
  ...props
}: Pick<
  TippyProps,
  | "content"
  | "visible"
  | "onClickOutside"
  | "interactive"
  | "trigger"
  | "placement"
  | "children"
>) {
  return (
    <LazyTippy
      {...props}
      appendTo={document.getElementsByClassName("root").item(0)!}
      animation="scale-subtle"
      theme="roc-and-roll"
    >
      {children}
    </LazyTippy>
  );
}

// From https://gist.github.com/atomiks/520f4b0c7b537202a23a3059d4eec908

// Will only render the `content` or `render` elements if the tippy is mounted to the DOM.
// Replace <Tippy /> with <LazyTippy /> component and it should work the same.
const LazyTippy = (props: TippyProps) => {
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

  return <Tippy {...computedProps} />;
};
