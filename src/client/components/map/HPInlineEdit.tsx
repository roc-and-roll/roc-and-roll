import React, { useEffect, useRef, useState } from "react";

export function HPInlineEdit({
  hp,
  setHP,
}: {
  hp: number;
  setHP: (hp: number) => void;
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
      throw new Error("Unexpected preix");
    }

    return true;
  };

  // if HP changes from the outside, update the input field with the new HP
  useEffect(() => {
    setLocalHP(hp.toString());
  }, [hp]);

  return (
    <input
      ref={ref}
      className="hp-inline-edit"
      type="text"
      value={localHP}
      onChange={(e) => setLocalHP(e.target.value)}
      // Avoid bubbling up the events that are also subscribed to by the <Map>
      // component, so that they are not preventDefaulted.
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();

        if (e.key === "Enter") {
          if (updateHP()) {
            ref.current?.blur();
          } else {
            // The user entered garbage, ignore the event.
          }
        }
      }}
      onFocus={() => ref.current?.select()}
      onBlur={() => {
        if (!updateHP()) {
          // If the user entered garbage, replace the HP with the correct value
          setLocalHP(hp.toString());
        }
      }}
    />
  );
}
