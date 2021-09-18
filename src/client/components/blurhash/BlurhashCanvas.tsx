import * as React from "react";
import { decode } from "blurhash";

/**
 * BlurhashCanvas component based on react-blurhash
 * @url https://github.com/woltapp/react-blurhash
 * @license MIT
 * @author Klaus Nygård https://github.com/nygardk
 */

export type Props = React.CanvasHTMLAttributes<HTMLCanvasElement> & {
  hash: string;
  width?: number;
  height?: number;
  punch?: number;
};

const BlurhashCanvas = React.memo(function BlurhashCanvas(props: Props) {
  const { hash, punch, width: propWidth, height: propHeight, ...rest } = props;
  const width = propWidth ?? 128;
  const height = propHeight ?? 128;

  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!ref.current) {
      return;
    }

    const pixels = decode(hash, width, height, punch);

    const ctx = ref.current.getContext("2d")!;
    const imageData = ctx.createImageData(width, height);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);
  }, [hash, width, height, punch]);

  return <canvas {...rest} height={height} width={width} ref={ref} />;
});

export default BlurhashCanvas;