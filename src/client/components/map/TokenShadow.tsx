import React, { useCallback, useEffect, useRef, useContext } from "react";
import * as PIXI from "pixi.js";
import haloImage from "./halo.png";
import { AppContext, Container, Sprite } from "react-pixi-fiber";

export function TokenShadow({
  color,
  pulse,
  size,
}: {
  color: number;
  pulse: number;
  size: number;
}) {
  const totalSize = size * 2;
  const containerRef = useRef<PIXI.Container>(null);

  const app = useContext(AppContext);

  const step = useCallback(() => {
    const now = performance.now();
    if (containerRef.current) {
      const scale = Math.abs(Math.sin(now * (1 / pulse) * 0.003) * 0.5) + 0.5;
      containerRef.current.scale.x = scale;
      containerRef.current.scale.y = scale;
    }
  }, [pulse]);

  useEffect(() => {
    app.ticker.add(step, PIXI.UPDATE_PRIORITY.LOW);
    return () => {
      app.ticker.remove(step);
    };
  }, [app.ticker, step]);

  return (
    <Container ref={containerRef} x={size / 2} y={size / 2}>
      <Sprite
        x={-size}
        y={-size}
        pivot={0.5}
        width={totalSize}
        height={totalSize}
        tint={color}
        texture={PIXI.Texture.from(haloImage)}
      />
    </Container>
  );
}
