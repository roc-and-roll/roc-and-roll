import React from "react";
import { render, act, fireEvent } from "@testing-library/react";
import { HPInlineEdit } from "./HPInlineEdit";

describe("HPInlineEdit", () => {
  it.each([["blur"], ["enter"]])(
    "works when changing the value absolutely via %s",
    (method) => {
      const setHP = jest.fn();
      const { getByPlaceholderText } = render(
        <HPInlineEdit hp={42} setHP={setHP} />
      );
      const input = getByPlaceholderText("HP");

      expect(setHP).not.toHaveBeenCalled();

      act(() => {
        input.focus();
        fireEvent.change(input, { target: { value: "15" } });
      });

      expect(setHP).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(input);

      act(() => {
        if (method === "blur") {
          input.blur();
        } else {
          fireEvent.keyDown(input, { key: "Enter" });
        }
      });

      expect(document.activeElement).not.toBe(input);
      expect(setHP).toHaveBeenCalledWith(15);
      expect(setHP).toHaveBeenCalledTimes(1);
    }
  );
});
