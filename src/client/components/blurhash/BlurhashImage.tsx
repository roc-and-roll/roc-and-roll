import composeRefs from "@seznam/compose-react-refs";
import { decode } from "blurhash";
import React, { ImgHTMLAttributes, useEffect, useState } from "react";
import { RRAssetImage } from "../../../shared/state";
import { assetUrl } from "../../files";

const CANVAS_SIZE = 32;

export const BlurhashImage = React.forwardRef<
  HTMLImageElement,
  {
    image: RRAssetImage | { blurhash: string; url: string };
    width: number;
    height: number;
    offset?: number;
  } & Partial<
    Omit<ImgHTMLAttributes<HTMLImageElement>, "width" | "height" | "src">
  >
>(function BlurhashImage(
  { image, width, height, onLoad, style, offset, ...rest },
  externalRef
) {
  const [loaded, setLoaded] = useState(false);

  style = { ...style, marginLeft: offset ?? 0, marginTop: offset ?? 0 };

  const [blurhashUrl, setBlurhashUrl] = useState<null | string>(null);

  useEffect(() => {
    if (loaded) {
      return;
    }

    const pixels = decode(image.blurhash, CANVAS_SIZE, CANVAS_SIZE);

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const imageData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);

    let isCancelled = false;
    canvas.toBlob((blob) => {
      if (isCancelled) {
        return;
      }
      setBlurhashUrl((oldUrl) => {
        if (oldUrl) {
          URL.revokeObjectURL(oldUrl);
        }
        return URL.createObjectURL(blob);
      });
    });

    return () => {
      isCancelled = true;
      setBlurhashUrl((oldUrl) => {
        if (oldUrl) {
          URL.revokeObjectURL(oldUrl);
        }
        return null;
      });
    };
  }, [image.blurhash, loaded]);

  return (
    <img
      ref={composeRefs(externalRef, (ref) => {
        if (ref?.complete) {
          setLoaded(true);
        }
      })}
      width={width}
      height={height}
      src={"url" in image ? image.url : assetUrl(image)}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      style={
        !loaded && blurhashUrl
          ? {
              ...style,
              backgroundImage: `url("${blurhashUrl}")`,
              backgroundSize: `${width}px ${height}px`,
            }
          : style
      }
      {...rest}
    />
  );
});
