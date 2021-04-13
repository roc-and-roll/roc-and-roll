import React from "react";
import useLocalState from "../useLocalState";

export function LocalStateExample() {
  const [clicks, setClicks, forgetClicks] = useLocalState("clicks", 0);

  return (
    <>
      You clicked this{" "}
      <button onClick={() => setClicks((old) => old + 1)}>button</button>{" "}
      {clicks} times. Try refreshing the page.{" "}
      <button onClick={() => forgetClicks()}>forget clicks</button>
    </>
  );
}
