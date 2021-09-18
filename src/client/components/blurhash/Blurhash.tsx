import * as React from "react";
import BlurhashCanvas from "./BlurhashCanvas";

/**
 * Blurhash component based on react-blurhash
 * @url https://github.com/woltapp/react-blurhash
 * @license MIT
 * @author Klaus Nygård https://github.com/nygardk
 */

type Props = React.HTMLAttributes<HTMLDivElement> & {
  hash: string;
  /** CSS height, default: 128 */
  height?: number | string | "auto";
  punch?: number;
  resolutionX?: number;
  resolutionY?: number;
  style?: React.CSSProperties;
  /** CSS width, default: 128 */
  width?: number | string | "auto";
};

const canvasStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  width: "100%",
  height: "100%",
};

const Blurhash = React.memo(function Blurhash({
  hash,
  height,
  width,
  punch,
  resolutionX,
  resolutionY,
  style,
  ...rest
}: Props) {
  height ??= 128;
  width ??= 128;
  resolutionX ??= 32;
  resolutionY ??= 32;

  if (resolutionX <= 0) {
    throw new Error("resolutionX must be larger than zero");
  }

  if (resolutionY <= 0) {
    throw new Error("resolutionY must be larger than zero");
  }

  return (
    <div
      {...rest}
      style={{
        display: "inline-block",
        height,
        width,
        ...style,
        position: "relative",
      }}
    >
      <BlurhashCanvas
        hash={hash}
        height={resolutionY}
        width={resolutionX}
        punch={punch}
        style={canvasStyle}
      />
    </div>
  );
});

export default Blurhash;
