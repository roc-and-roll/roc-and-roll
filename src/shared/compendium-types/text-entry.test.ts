import { isTextEntry } from "./text-entry";

describe("text entry schema", () => {
  it.each([
    ["test", true],
    [null, false],
    [{ type: "cell", roll: { exact: 3 } }, true],
    [{ type: "cell", roll: { min: 2, max: 3 } }, true],
    [{ type: "cell", roll: { min: 2, max: 3, pad: true } }, true],
    [{ type: "list", items: ["foo", { type: "list", items: [] }] }, true],
  ])("works", (entry, result) => {
    expect(isTextEntry.safeParse(entry).success).toBe(result);
  });

  it("uses correct keys for recursive errors", () => {
    expect(
      isTextEntry.safeParse({
        type: "list",
        items: ["foo", "bar"],
      }).success
    ).toBe(true);

    const validationResult = isTextEntry.safeParse({
      type: "list",
      items: ["foo", false],
    });

    expect(validationResult.success).toBe(false);
  });
});
