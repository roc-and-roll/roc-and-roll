import { parseDiceString } from "./grammar";

test("grammar", () => {
  expect(parseDiceString("1d20")).toMatchInlineSnapshot(`
Object {
  "count": 1,
  "damage": Object {
    "type": null,
  },
  "faces": 20,
  "modified": "none",
  "results": "not-yet-rolled",
  "type": "dice",
}
`);
  expect(parseDiceString("2 × 3 × 4")).toMatchInlineSnapshot(`
Object {
  "operands": Array [
    Object {
      "damage": Object {
        "type": null,
      },
      "type": "num",
      "value": 2,
    },
    Object {
      "damage": Object {
        "type": null,
      },
      "type": "num",
      "value": 3,
    },
    Object {
      "damage": Object {
        "type": null,
      },
      "type": "num",
      "value": 4,
    },
  ],
  "operator": "*",
  "type": "term",
}
`);
  expect(parseDiceString("2 + 3 * 4")).toMatchInlineSnapshot(`
Object {
  "operands": Array [
    Object {
      "damage": Object {
        "type": null,
      },
      "type": "num",
      "value": 2,
    },
    Object {
      "operands": Array [
        Object {
          "damage": Object {
            "type": null,
          },
          "type": "num",
          "value": 3,
        },
        Object {
          "damage": Object {
            "type": null,
          },
          "type": "num",
          "value": 4,
        },
      ],
      "operator": "*",
      "type": "term",
    },
  ],
  "operator": "+",
  "type": "term",
}
`);

  expect(parseDiceString("-4")).toMatchInlineSnapshot(`
Object {
  "inner": Object {
    "damage": Object {
      "type": null,
    },
    "type": "num",
    "value": 4,
  },
  "type": "negated",
}
`);
});
