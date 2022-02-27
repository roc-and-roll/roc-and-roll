import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as particles from "@pixi/particle-emitter";
import * as PIXI from "pixi.js";
import { Container } from "react-pixi-fiber";
import { RRMap, RRPoint } from "../../shared/state";
import { useServerDispatch, useServerState } from "../state";
import { useMyProps } from "../myself";
import { mapSettingsUpdate } from "../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../shared/constants";
import { lerp } from "../../shared/util";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBan,
  faCloud,
  faBolt,
  faCloudShowersHeavy,
  faFire,
  faSnowflake,
  faDungeon,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "./ui/Button";
import rainImage from "./rain.png";
import snowImage from "./snow.png";
import { Point } from "pixi.js";
import { Particle } from "@pixi/particle-emitter";
import { PRectangle } from "./map/Primitives";

export const PixiFilterContext = React.createContext<{
  addFilter: (f: PIXI.Filter) => void;
  removeFilter: (f: PIXI.Filter) => void;
  getFilters: () => PIXI.Filter[];
}>({
  addFilter: () => {},
  removeFilter: () => {},
  getFilters: () => [],
});

export function PixiGlobalFilters({
  children,
  backgroundColor,
  viewPortSize,
}: {
  children: React.ReactNode;
  backgroundColor: number;
  viewPortSize: RRPoint;
}) {
  const [filters, setFilters] = useState<PIXI.Filter[]>([]);
  const addFilter = useCallback((filter: PIXI.Filter) => {
    setFilters((filters) => [...filters, filter]);
  }, []);
  const removeFilter = useCallback((filter: PIXI.Filter) => {
    // FIXME may only want to remove one occurrence
    setFilters((filters) => filters.filter((f) => f !== filter));
  }, []);

  const getFilters = useCallback(() => filters, [filters]);

  console.log(backgroundColor);
  return (
    <PixiFilterContext.Provider value={{ addFilter, removeFilter, getFilters }}>
      <Container filters={filters}>
        <PRectangle
          x={0}
          y={0}
          width={viewPortSize.x}
          height={viewPortSize.y}
          fill={backgroundColor}
        />
        {children}
      </Container>
      <AtmosphereMap viewPortSize={viewPortSize} />
    </PixiFilterContext.Provider>
  );
}

const effects: {
  [key in RRMap["settings"]["atmosphere"]["type"]]: {
    icon: IconDefinition;
    build: (intensity: number, size: RRPoint) => JSX.Element;
  };
} = {
  none: {
    icon: faBan,
    build: (intensity, size) => <></>,
  },
  rain: {
    icon: faCloudShowersHeavy,
    build: (intensity, size) => <Rain intensity={intensity} size={size} />,
  },
  snow: {
    icon: faSnowflake,
    build: (intensity, size) => <Snow intensity={intensity} size={size} />,
  },
  fog: {
    icon: faCloud,
    build: (intensity, size) => <Fog intensity={intensity} size={size} />,
  },
  thunderstorm: {
    icon: faBolt,
    build: (intensity, size) => (
      <>
        <Rain intensity={intensity} size={size} />
        <Thunder intensity={intensity} size={size} />
      </>
    ),
  },
  fire: {
    icon: faFire,
    build: (intensity, size) => <Fire intensity={intensity} size={size} />,
  },
  dungeon: {
    icon: faDungeon,
    build: (intensity, size) => (
      <>
        <Fog intensity={intensity * 2} size={size} />
        <Vignette intensity={intensity} size={size} />
      </>
    ),
  },
};

export function Atmosphere() {
  const dispatch = useServerDispatch();
  const myself = useMyProps("currentMap");
  const map = useServerState((s) => s.maps.entities[myself.currentMap]!);

  const setType = (type: RRMap["settings"]["atmosphere"]["type"]) => {
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
        {Object.entries(effects).map(([type, effect]) => (
          <Button
            key={type}
            className={
              type === map.settings.atmosphere.type ? "bg-rrOrange" : ""
            }
            onClick={() =>
              setType(type as RRMap["settings"]["atmosphere"]["type"])
            }
          >
            <FontAwesomeIcon icon={effect.icon} />
          </Button>
        ))}
      </div>
    </>
  );
}

export function AtmosphereMap({
  viewPortSize: size,
}: {
  viewPortSize: RRPoint;
}) {
  const myself = useMyProps("currentMap");
  const atmosphere = useServerState(
    (s) => s.maps.entities[myself.currentMap]!.settings.atmosphere
  );

  return effects[atmosphere.type].build(atmosphere.intensity, size);
}

function ParticleSystem({ config }: { config: particles.EmitterConfigV3 }) {
  const [container, setContainer] = useState<PIXI.Container | null>(null);

  useEffect(() => {
    const emitter = container ? new particles.Emitter(container, config) : null;
    return () => {
      if (emitter) emitter.destroy();
    };
  }, [container, config]);

  const updateContainer = useCallback(
    (container: PIXI.Container) => setContainer(container),
    []
  );
  return <Container ref={updateContainer}></Container>;
}

function Rain({ intensity, size }: { intensity: number; size: RRPoint }) {
  const config = useMemo(() => {
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
              w: size.x,
              h: 20,
            },
          },
        },
      ],
    };
  }, [intensity, size]);
  return <ParticleSystem config={config} />;
}

function Snow({ intensity, size }: { intensity: number; size: RRPoint }) {
  const config = useMemo(() => {
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
              w: size.x,
              h: 20,
            },
          },
        },
      ],
    };
  }, [intensity, size]);
  return <ParticleSystem config={config} />;
}

function Fire({ intensity, size }: { intensity: number; size: RRPoint }) {
  const config = useMemo(() => {
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
              y: size.y,
              w: size.x,
              h: 20,
            },
          },
        },
      ],
    };
  }, [intensity, size]);
  return <ParticleSystem config={config} />;
}

function Fog({ intensity, size }: { intensity: number; size: RRPoint }) {
  const config = useMemo(() => {
    const lifetime = 30;
    const alpha = lerp(0.2, 0.1, intensity > 1 ? 0 : intensity);
    return {
      emit: true,
      autoUpdate: true,
      lifetime: {
        min: lifetime * 0.7,
        max: lifetime,
      },
      frequency: lerp(0.6, 0.2, intensity),
      emitterLifetime: 0,
      maxParticles: 600,
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
            max: lerp(-60, -150, Math.min(intensity, 1)),
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
              y: size.y,
              w: size.x,
              h: 20,
            },
          },
        },
      ],
    };
  }, [intensity, size]);
  return <ParticleSystem config={config} />;
}

function Thunder({ intensity, size }: { intensity: number; size: RRPoint }) {
  const [opacity, setOpacity] = useState(0);
  const rafId = useRef<number | null>(null);
  const activatedTime = useRef<number>(0);
  const duration = 300;

  const step = useCallback(
    (now) => {
      const visible = opacity !== 0;
      const elapsed = now - activatedTime.current;
      if (visible) {
        if (elapsed > duration) setOpacity(0);
        else setOpacity(1 - elapsed / duration);
      }
      if (!visible && Math.random() < 0.005 * intensity) {
        setOpacity(1);
        activatedTime.current = now;
      }
      rafId.current = requestAnimationFrame(step);
    },
    [intensity, opacity]
  );

  useEffect(() => {
    rafId.current = requestAnimationFrame(step);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [step]);

  return (
    <PRectangle
      x={0}
      y={0}
      width={size.x}
      height={size.y}
      alpha={opacity}
      fill={0xffffff}
    />
  );
}

function Vignette({ intensity, size }: { intensity: number; size: RRPoint }) {
  const { addFilter, removeFilter } = useContext(PixiFilterContext);
  useEffect(() => {
    // pixi takes care of caching the resulting program for the same shader code
    const filter = new PIXI.Filter(
      undefined,
      /*cspell:disable*/
      `
precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float size;
uniform float amount;
uniform float focalPointX;
uniform float focalPointY;
void main() {
  vec4 rgba = texture2D(uSampler, vTextureCoord);
  vec3 rgb = rgba.xyz;
  float dist = distance(vTextureCoord, vec2(focalPointX, focalPointY));
  rgb *= smoothstep(0.8, size * 0.799, dist * (0.5 * amount + size));
  gl_FragColor = vec4(vec3(rgb), rgba.a);
}`,
      /*cspell:enable*/
      {
        amount: lerp(1.5, 2.4, intensity),
        size: 0.5,
        focalPointX: 0.5,
        focalPointY: 0.5,
      }
    );

    addFilter(filter);
    return () => removeFilter(filter);
  }, [addFilter, intensity, removeFilter]);
  return <></>;
}

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
