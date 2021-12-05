import { getPartsFromTextEntryString } from "./QuickReference";

describe("getPartsFromTextEntryString", () => {
  it.each([
    ["test abc", ["test abc"]],
    ["test {foo} bar", ["test ", "{foo}", " bar"]],
    ["test {foo}", ["test ", "{foo}"]],
    ["{foo}", ["{foo}"]],
    ["{foo} bar", ["{foo}", " bar"]],
    ["test {foo {nested}} bar", ["test ", "{foo {nested}}", " bar"]],
  ])("works", (input, output) => {
    const parts = Array.from(getPartsFromTextEntryString(input));
    expect(parts).toEqual(output);
  });
});
