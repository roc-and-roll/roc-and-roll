import React, { useEffect, useRef, useState } from "react";
import { SmartTextInput } from "../ui/TextInput";

export function HPInlineEdit({
  hp,
  setHP,
  className,
}: {
  hp: number;
  setHP: (hp: number) => void;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [localHP, setLocalHP] = useState(hp.toString());

  const updateHP = () => {
    const matches = /^([+-]|)(\d+)$/.exec(localHP);
    if (!matches || matches.length !== 3) {
      return false;
    }

    const prefix = matches[1]!;
    const number = parseInt(matches[2]!);

    if (prefix === "") {
      setHP(number);
    } else if (prefix === "-") {
      setHP(hp - number);
    } else if (prefix === "+") {
      setHP(hp + number);
    } else {
      throw new Error("Unexpected prefix");
    }

    return true;
  };

  // if HP changes from the outside, update the input field with the new HP
  useEffect(() => {
    setLocalHP(hp.toString());
  }, [hp]);

  const ignoreBlurRef = useRef(false);

  return (
    <SmartTextInput
      ref={ref}
      className={"hp-inline-edit " + (className ?? "")}
      placeholder="HP"
      type="text"
      value={localHP}
      onChange={(hp) => setLocalHP(hp)}
      // Avoid bubbling up the events that are also subscribed to by the <Map>
      // component, so that they are not preventDefaulted.
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();

        if (e.key === "Enter") {
          if (updateHP()) {
            ignoreBlurRef.current = true;
            ref.current?.blur();
          } else {
            // The user entered garbage, ignore the event.
          }
        }
      }}
      onFocus={() => ref.current?.select()}
      onBlur={() => {
        // Only update the hp if blur is not caused by the manual call to blur()
        // in the keydown handler (isTrusted = false). Otherwise, we call
        // updateHP twice, once in the keydown handler and once in the blur
        // handler.
        if (ignoreBlurRef.current) {
          ignoreBlurRef.current = false;
          return;
        }
        if (!updateHP()) {
          // If the user entered garbage, replace the HP with the correct value
          setLocalHP(hp.toString());
        }
      }}
    />
  );
}
