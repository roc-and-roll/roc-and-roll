import React, { useEffect, useState } from "react";
import { RRCharacter } from "../../../shared/state";
import { clamp } from "../../../shared/util";
import { tokenImageUrl } from "../../files";

export function TokenPreview({ token }: { token: RRCharacter }) {
  return (
    <div
      className="token-image"
      title={token.name}
      style={{
        backgroundImage: token.image
          ? `url(${tokenImageUrl(token.image, 32)})`
          : "none",
      }}
    />
  );
}

export function TokenStack({ tokens }: { tokens: RRCharacter[] }) {
  const [topIdx, setTopIdx] = useState(0);

  // Allow to click through all tokens
  const sortedTokens = [...tokens.slice(topIdx), ...tokens.slice(0, topIdx)];
  useEffect(() => {
    setTopIdx((old) => clamp(0, old, tokens.length - 1));
  }, [tokens.length]);

  return (
    <div
      className="token-stack"
      onClick={() =>
        setTopIdx((old) => (old === 0 ? tokens.length - 1 : old - 1))
      }
    >
      {sortedTokens.map((token, i) => (
        <div
          key={token.id}
          style={{
            left:
              tokens.length === 1
                ? 24 / 2 // center token if there is just one in the stack
                : i === 0
                ? 0 // avoid division by 0
                : i * (24 / (tokens.length - 1)),
          }}
        >
          <TokenPreview token={token} />
        </div>
      ))}
    </div>
  );
}
