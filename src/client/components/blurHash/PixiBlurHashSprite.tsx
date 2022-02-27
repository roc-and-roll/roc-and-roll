import React, { useEffect, useMemo, useState } from "react";
import * as PIXI from "pixi.js";
// cspell: disable-next-line
import { decode } from "blurhash";
import { PixiElement, Sprite } from "react-pixi-fiber";

export function PixiBlurHashSprite({
  url,
  blurHash,
  blurHashOnly,
  ...rest
}:
  | {
      blurHash: string;
      url: string;
      blurHashOnly?: boolean;
    } & Pick<
      PixiElement<Sprite>,
      | "x"
      | "y"
      | "width"
      | "height"
      | "name"
      | "mousedown"
      | "mouseup"
      | "rightdown"
      | "rightup"
      | "cursor"
      | "interactive"
      | "angle"
      | "filters"
    >) {
  const blurHashTexture = useMemo(() => {
    const size = 32;
    const data = decode(blurHash, size, size);
    return PIXI.Texture.fromBuffer(data as unknown as Uint8Array, size, size, {
      scaleMode: PIXI.SCALE_MODES.LINEAR,
    });
  }, [blurHash]);
  const [texture, setTexture] = useState<PIXI.Texture>(blurHashTexture);

  useEffect(() => {
    const cancel = new AbortController();
    if (!blurHashOnly) {
      PIXI.Texture.fromURL(url)
        .then((texture) => {
          if (!cancel.signal.aborted) {
            setTexture(texture);
          }
        })
        .catch((err) => console.error("Failed to load image", err));
    }
    return () => {
      cancel.abort();
    };
  }, [blurHashOnly, url]);

  const pivot = {
    x: texture.width / 2,
    y: texture.height / 2,
  };
  return <Sprite {...rest} texture={texture} pivot={pivot} />;
}
