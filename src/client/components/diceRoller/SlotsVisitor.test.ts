import { parseDiceStringAndRoll } from "../../dice-rolling/roll";
import { SlotsVisitor } from "./SlotsVisitor";

describe("SlotsVisitor", () => {
  it.each(["-5", "--5", "-(5)", "10-(5)", "10+-5", "10-5", "1-(2-3)"])(
    "correctly handles negative numbers in all cases %s",
    (diceRoll: string) => {
      const visitor = new SlotsVisitor();
      const result = visitor.visit(parseDiceStringAndRoll(diceRoll));
      expect(result).toMatchSnapshot();
    }
  );
});
