import React from "react";
import useLocalState from "../useLocalState";
import { Button } from "./ui/Button";

export function LocalStateExample() {
  const [clicks, setClicks, forgetClicks] = useLocalState("clicks", 0);

  return (
    <p>
      You clicked this{" "}
      <Button onClick={() => setClicks((old) => old + 1)}>button</Button>{" "}
      {clicks} times. Try refreshing the page.{" "}
      <Button onClick={() => forgetClicks()}>forget clicks</Button>
    </p>
  );
}
