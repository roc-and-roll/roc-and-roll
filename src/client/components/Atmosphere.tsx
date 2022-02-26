import React, { useCallback, useEffect, useRef, useState } from "react";
import * as particles from "@pixi/particle-emitter";
import * as PIXI from "pixi.js";
import { Container } from "react-pixi-fiber";
import { RRMap, RRPoint } from "../../shared/state";
import { useServerDispatch, useServerState } from "../state";
import { useMyProps } from "../myself";
import { mapSettingsUpdate } from "../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../shared/constants";
import { assertNever, lerp } from "../../shared/util";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBan,
  faCloud,
  faCloudShowersHeavy,
  faFire,
  faSnowflake,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "./ui/Button";
import rainImage from "./rain.png";
import snowImage from "./snow.png";
import { Point } from "pixi.js";
import { Particle } from "@pixi/particle-emitter";

export function Atmosphere() {
  const dispatch = useServerDispatch();
  const myself = useMyProps("currentMap");
  const map = useServerState((s) => s.maps.entities[myself.currentMap]!);

  const setType = (type: RRMap["settings"]["atmosphere"]["type"]) => {
    console.log(type);
    dispatch({
      actions: [
        mapSettingsUpdate({
          id: map.id,
          changes: {
            atmosphere: {
              ...map.settings.atmosphere,
              type,
            },
          },
        }),
      ],
      optimisticKey: `atmosphere/intensity/${map.id}`,
      syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
    });
  };

  return (
    <>
      <div className="flex mb-2">
        Intensity:
        <input
          type="range"
          min={0}
          step={0.01}
          max={1}
          value={map.settings.atmosphere.intensity}
          onChange={(e) =>
            dispatch({
              actions: [
                mapSettingsUpdate({
                  id: map.id,
                  changes: {
                    atmosphere: {
                      ...map.settings.atmosphere,
                      intensity: e.target.valueAsNumber,
                    },
                  },
                }),
              ],
              optimisticKey: `atmosphere/intensity/${map.id}`,
              syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
            })
          }
        />
      </div>
      <div>
        <Button onClick={() => setType("none")}>
          <FontAwesomeIcon icon={faBan} />
        </Button>
        <Button onClick={() => setType("snow")}>
          <FontAwesomeIcon icon={faSnowflake} />
        </Button>
        <Button onClick={() => setType("rain")}>
          <FontAwesomeIcon icon={faCloudShowersHeavy} />
        </Button>
        <Button onClick={() => setType("fire")}>
          <FontAwesomeIcon icon={faFire} />
        </Button>
        <Button onClick={() => setType("fog")}>
          <FontAwesomeIcon icon={faCloud} />
        </Button>
      </div>
    </>
  );
}

export function AtmosphereMap({ viewPortSize }: { viewPortSize: RRPoint }) {
  const [container, setContainer] = useState<PIXI.Container | null>(null);
  const emitterRef = useRef<particles.Emitter | null>(null);

  const myself = useMyProps("currentMap");
  const atmosphere = useServerState(
    (s) => s.maps.entities[myself.currentMap]!.settings.atmosphere
  );

  const effectMap = (
    type: Exclude<RRMap["settings"]["atmosphere"]["type"], "none">
  ) => {
    console.log("playing", type);
    switch (type) {
      case "rain":
        return rain;
      case "snow":
        return snow;
      case "fire":
        return fire;
      case "fog":
        return fog;
      default:
        return assertNever(type);
    }
  };

  useEffect(() => {
    const emitter =
      container && atmosphere.type !== "none"
        ? new particles.Emitter(
            container,
            effectMap(atmosphere.type)(atmosphere.intensity, viewPortSize)
          )
        : null;
    emitterRef.current = emitter;
    return () => {
      if (emitterRef.current) emitterRef.current.destroy();
    };
  }, [container, viewPortSize, atmosphere.intensity, atmosphere.type]);

  const updateContainer = useCallback(
    (container: PIXI.Container) => setContainer(container),
    []
  );

  return <Container ref={updateContainer}></Container>;
}

const rain = (
  intensity: number,
  viewPortSize: RRPoint
): particles.EmitterConfigV3 => {
  const angle = lerp(60, 88, 1 - intensity);
  const speed = lerp(2000, 3600, intensity);
  const scale = lerp(0.5, 0.8, intensity);
  return {
    emit: true,
    autoUpdate: true,
    lifetime: {
      min: 0.81,
      max: 0.81,
    },
    frequency: lerp(0.008, 0.001, intensity),
    emitterLifetime: 0,
    maxParticles: 1000,
    addAtBack: false,
    pos: {
      x: lerp(-350, 0, 1 - intensity),
      y: -100,
    },
    behaviors: [
      {
        type: "alphaStatic",
        config: {
          alpha: 0.17,
        },
      },
      {
        type: "moveSpeedStatic",
        config: {
          min: speed,
          max: speed,
        },
      },
      {
        type: "scaleStatic",
        config: {
          min: scale,
          max: scale,
        },
      },
      {
        type: "rotationStatic",
        config: {
          min: angle,
          max: angle,
        },
      },
      {
        type: "textureRandom",
        config: {
          textures: [rainImage],
        },
      },
      {
        type: "spawnShape",
        config: {
          type: "rect",
          data: {
            x: 0,
            y: 0,
            w: viewPortSize.x,
            h: 20,
          },
        },
      },
    ],
  };
};

const snow = (intensity: number, viewPortSize: RRPoint) => {
  const angle = lerp(60, 88, 1 - intensity);
  const speed = lerp(150, 300, intensity);
  const scale = lerp(0.7, 1, intensity);
  const lifetime = 7;
  return {
    emit: true,
    autoUpdate: true,
    lifetime: {
      min: lifetime,
      max: lifetime,
    },
    frequency: lerp(0.008, 0.003, intensity),
    emitterLifetime: 0,
    maxParticles: 3000,
    addAtBack: false,
    pos: {
      x: lerp(-350, 0, 1 - intensity),
      y: -100,
    },
    behaviors: [
      {
        type: "alphaStatic",
        config: {
          alpha: 0.2,
        },
      },
      {
        type: "moveSpeedStatic",
        config: {
          min: speed * 0.3,
          max: speed,
        },
      },
      {
        type: "scaleStatic",
        config: {
          min: scale * 0.2,
          max: scale,
        },
      },
      {
        type: "rotationStatic",
        config: {
          min: angle * 0.5,
          max: angle,
        },
      },
      {
        type: "textureRandom",
        config: {
          textures: [snowImage],
        },
      },
      {
        type: "spawnShape",
        config: {
          type: "rect",
          data: {
            x: 0,
            y: 0,
            w: viewPortSize.x,
            h: 20,
          },
        },
      },
    ],
  };
};

const fire = (intensity: number, viewPortSize: RRPoint) => {
  const lifetime = 3;
  return {
    emit: true,
    autoUpdate: true,
    lifetime: {
      min: lifetime * 0.7,
      max: lifetime,
    },
    frequency: lerp(0.08, 0.007, intensity),
    emitterLifetime: 0,
    maxParticles: 1000,
    addAtBack: false,
    pos: {
      x: 0,
      y: 0,
    },
    behaviors: [
      {
        type: "alphaStatic",
        config: {
          alpha: 0.8,
        },
      },
      {
        type: "colorStatic",
        config: {
          color: "#ff0000",
        },
      },
      {
        type: "rotation",
        config: {
          minStart: 90,
          maxStart: 90,
          minSpeed: -30,
          maxSpeed: 30,
          accel: 6,
        },
      },
      {
        type: "rotatedSpeed",
        config: {
          min: -300,
          max: -600,
        },
      },
      {
        type: "scaleStatic",
        config: {
          min: 0.1,
          max: 0.2,
        },
      },
      {
        type: "textureRandom",
        config: {
          textures: [snowImage],
        },
      },
      {
        type: "spawnShape",
        config: {
          type: "rect",
          data: {
            x: 0,
            y: viewPortSize.y,
            w: viewPortSize.x,
            h: 20,
          },
        },
      },
    ],
  };
};

const fog = (intensity: number, viewPortSize: RRPoint) => {
  const lifetime = 30;
  const alpha = lerp(0.1, 0.2, 1 - intensity);
  return {
    emit: true,
    autoUpdate: true,
    lifetime: {
      min: lifetime * 0.7,
      max: lifetime,
    },
    frequency: lerp(0.6, 0.2, intensity),
    emitterLifetime: 0,
    maxParticles: 300,
    addAtBack: false,
    pos: {
      x: 0,
      y: 0,
    },
    behaviors: [
      {
        type: "alpha",
        config: {
          alpha: {
            list: [
              { value: 0, time: 0 },
              { value: alpha, time: 0.07 },
              { value: alpha, time: 0.9 },
              { value: 0, time: 1 },
            ],
          },
        },
      },
      {
        type: "rotation",
        config: {
          minStart: 90,
          maxStart: 90,
          minSpeed: -30,
          maxSpeed: 30,
          accel: 2,
        },
      },
      {
        type: "rotatedSpeed",
        config: {
          min: -30,
          max: lerp(-60, -150, intensity),
        },
      },
      {
        type: "scaleStatic",
        config: {
          min: 9,
          max: 12,
        },
      },
      {
        type: "textureRandom",
        config: {
          textures: [snowImage],
        },
      },
      {
        type: "spawnShape",
        config: {
          type: "rect",
          data: {
            x: 0,
            y: viewPortSize.y,
            w: viewPortSize.x,
            h: 20,
          },
        },
      },
    ],
  };
};

export class RotatedSpeedBehavior
  implements particles.behaviors.IEmitterBehavior
{
  public static type = "rotatedSpeed";
  // public static editorConfig: BehaviorEditorConfig = null;

  public order = particles.behaviors.BehaviorOrder.Late;
  private min: number;
  private max: number;
  constructor(config: {
    /**
     * Minimum speed when initializing the particle.
     */
    min: number;
    /**
     * Maximum speed when initializing the particle.
     */
    max: number;
  }) {
    this.min = config.min;
    this.max = config.max;
  }

  initParticles(first?: Particle): void {
    let next = first;

    while (next) {
      const speed = Math.random() * (this.max - this.min) + this.min;

      if (!next.config["velocity"]) {
        next.config["velocity"] = new Point(speed, 0);
      } else {
        (next.config["velocity"] as Point).set(speed, 0);
      }

      next = next.next;
    }
  }

  updateParticle(particle: Particle, deltaSec: number): void {
    const velocity = (particle.config["velocity"] as Point).clone();
    particles.ParticleUtils.rotatePoint(particle.rotation, velocity);

    particle.x += velocity.x * deltaSec;
    particle.y += velocity.y * deltaSec;
  }
}

particles.Emitter.registerBehavior(RotatedSpeedBehavior);
