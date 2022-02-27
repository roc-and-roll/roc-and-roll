import * as PIXI from "pixi.js-legacy";
import canvas from "canvas";
import { toMatchImageSnapshot } from "jest-image-snapshot";
import { applySVGPathToPixiGraphics } from "./applySVGPathToPixiGraphics";
import {
  faGolfBall,
  faGripLinesVertical,
  faLemon,
  faSlash,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { conditionIcons } from "../../../characters/CharacterEditor";
import {
  faHeart,
  faPaperPlane,
  faStar,
  faCircle,
  faSquare,
} from "@fortawesome/free-regular-svg-icons";
import { GRID_SIZE } from "../../../../../shared/constants";

// @ts-ignore
global["CanvasRenderingContext2D"] = canvas.Context2d;

expect.extend({ toMatchImageSnapshot });

function renderGraphicsToPNG(
  width: number,
  height: number,
  graphics: PIXI.Graphics
) {
  PIXI.utils.skipHello();

  const application = new PIXI.Application({
    width,
    height,
    forceCanvas: true,
    backgroundAlpha: 0,
  });

  application.stage.addChild(graphics);
  return renderApplicationToPNG(application);
}

function renderApplicationToPNG(application: PIXI.Application) {
  application.render();

  const dataUrl = application.view.toDataURL();
  const base64 = dataUrl.slice("data:image/png;base64,".length);
  return Buffer.from(base64, "base64");
}

describe("applySVGPathToPixiGraphics", () => {
  test.each(
    [
      faSlash,
      faStar,
      faGripLinesVertical,
      faPaperPlane,
      faHeart,
      faCircle,
      faLemon,
      faGolfBall,
      faSquare,
      ...Object.values(conditionIcons).flatMap((icon) =>
        "icon" in (icon as any) ? [icon as IconDefinition] : []
      ),
      {
        iconName: "mouse cursor",
        icon: [
          GRID_SIZE,
          GRID_SIZE,
          0,
          0,
          `m 0 0 v ${GRID_SIZE} h ${(GRID_SIZE * 5) / 7} l ${
            (-GRID_SIZE * 5) / 7
          } ${-GRID_SIZE}`,
        ] as const,
      },
    ].map((icon) => [icon])
  )("test icon conversion %s", async (icon) => {
    const [width, height, _1, _2, svgPath] = icon.icon;

    if (Array.isArray(svgPath)) {
      fail();
    }

    const graphics = new PIXI.Graphics();
    graphics.lineStyle(2, 0xff0000, 1);
    graphics.beginFill(0xffffff, 1);
    applySVGPathToPixiGraphics(graphics, svgPath);
    graphics.endFill();

    // TODO: The fill is incorrect for icons that have holes.
    expect(renderGraphicsToPNG(width, height, graphics)).toMatchImageSnapshot({
      customSnapshotIdentifier: icon.iconName,
    });
  });
});
