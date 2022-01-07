// https://github.com/michalochman/react-pixi-fiber/blob/master/README.md
import React from "react";

type ContextBridgeProps<T extends [...React.Context<any>[]]> = {
  contexts: T;
  barrierRender: (
    children: React.ReactElement | null
  ) => React.ReactElement | null;
  children: React.ReactNode;
};

export const ContextBridge = <T extends [...React.Context<any>[]]>({
  barrierRender,
  contexts,
  children,
}: ContextBridgeProps<T>) => {
  const providers = (values: unknown[]) => {
    const getValue = (i: number) => values[values.length - 1 - i];

    return (
      <>
        {contexts.reduce(
          (innerProviders, Context, i) => (
            <Context.Provider value={getValue(i)}>
              {innerProviders}
            </Context.Provider>
          ),
          children
        )}
      </>
    );
  };

  const consumers = contexts.reduce(
    (getChildren, Context) => (values: unknown[]) =>
      (
        <Context.Consumer>
          {(value) => getChildren([...values, value])}
        </Context.Consumer>
      ),
    (values: unknown[]) => barrierRender(providers(values))
  );

  return consumers([]);
};
