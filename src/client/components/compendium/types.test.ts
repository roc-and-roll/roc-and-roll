import { isTextEntry } from "./types";

describe("text entry schema", () => {
  it.each([
    ["test", true],
    [null, false],
    [{ type: "cell", roll: { exact: 3 } }, true],
    [{ type: "cell", roll: { min: 2, max: 3 } }, true],
    [{ type: "cell", roll: { min: 2, max: 3, pad: true } }, true],
    [{ type: "list", items: ["foo", { type: "list", items: [] }] }, true],
  ])("works", (entry, result) => {
    expect(isTextEntry(entry)).toBe(result);
  });

  it("uses correct keys for recursive errors", () => {
    const errors: string[] = [];
    expect(
      isTextEntry(
        {
          type: "list",
          items: ["foo", "bar"],
        },
        { errors }
      )
    ).toBe(true);

    expect(errors).toHaveLength(0);

    expect(
      isTextEntry(
        {
          type: "list",
          items: ["foo", false],
        },
        { errors }
      )
    ).toBe(false);

    expect(errors).toMatchInlineSnapshot(`
      Array [
        ".#1: Expected a string (got {\\"type\\":\\"list\\",\\"items\\":[\\"foo\\",false]})",
        ".#2.type: Expected a literal (got \\"entries\\")",
        ".#3.items[1]#1: Expected a string (got false)",
        ".#4.type: Expected a literal (got \\"table\\")",
        ".#5.type: Expected a literal (got \\"cell\\")",
      ]
    `);
  });
});
