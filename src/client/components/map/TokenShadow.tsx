import React, { useCallback, useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import haloImage from "./halo.png";
import { Container, Sprite } from "react-pixi-fiber";

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
  const rafId = useRef<number | null>();
  const spriteRef = useRef<PIXI.Container>(null);

  const step = useCallback(
    (now: number) => {
      if (spriteRef.current) {
        const scale = Math.abs(Math.sin(now * (1 / pulse) * 0.003) * 0.5) + 0.5;
        spriteRef.current.scale.x = scale;
        spriteRef.current.scale.y = scale;
      }
      rafId.current = requestAnimationFrame(step);
    },
    [pulse]
  );

  useEffect(() => {
    rafId.current = requestAnimationFrame(step);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [step]);

  return (
    <Container ref={spriteRef} x={size / 2} y={size / 2}>
      <Sprite
        x={-size}
        y={-size}
        width={totalSize}
        height={totalSize}
        tint={color}
        texture={PIXI.Texture.from(haloImage)}
      />
    </Container>
  );
}
