// cspell: disable-next-line
/* eslint-disable @grncdr/react-hooks/rules-of-hooks */
import useLocalState from "./useLocalState";

interface ValidJSON {
  key: number;
}

test.todo("Test the behavior of useLocalState");

function _() {
  // @ts-expect-error Date is not valid in JSON
  useLocalState("test", { key: new Date() });

  const validJSON: ValidJSON = { key: 1 };
  useLocalState("test", validJSON);
}
