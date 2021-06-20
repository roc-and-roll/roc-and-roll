import { linkify } from "./util";

describe("linkify", () => {
  it("works", () => {
    expect(linkify("test 123 abc")).toMatchInlineSnapshot(`
      Array [
        "test 123 abc",
      ]
    `);

    expect(linkify("test https://google.com?test=123 abc"))
      .toMatchInlineSnapshot(`
      Array [
        "test ",
        <a
          href="https://google.com?test=123"
          rel="noreferrer"
          target="_blank"
        >
          https://google.com?test=123
        </a>,
        " abc",
      ]
    `);

    expect(linkify("testhttps://google.com abc")).toMatchInlineSnapshot(`
      Array [
        "testhttps://google.com abc",
      ]
    `);

    expect(linkify("https://github.com")).toMatchInlineSnapshot(`
      Array [
        <a
          href="https://github.com"
          rel="noreferrer"
          target="_blank"
        >
          https://github.com
        </a>,
      ]
    `);

    expect(linkify("Go to https://github.com.")).toMatchInlineSnapshot(`
      Array [
        "Go to ",
        <a
          href="https://github.com"
          rel="noreferrer"
          target="_blank"
        >
          https://github.com
        </a>,
        ".",
      ]
    `);
  });
});
