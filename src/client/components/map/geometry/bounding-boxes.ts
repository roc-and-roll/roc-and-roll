import {
  EntityCollection,
  RRAsset,
  RRAssetImage,
  RRCharacter,
  RRMapDrawingImage,
  RRMapObject,
  RRPoint,
} from "../../../../shared/state";
import * as PIXI from "pixi.js";
import { assertNever } from "../../../../shared/util";
import { GRID_SIZE } from "../../../../shared/constants";
import {
  makePoint,
  pointAdd,
  pointLeftRotate,
  pointNormalize,
  pointScale,
  pointSubtract,
} from "../../../../shared/point";
import { roughTextFontFamily } from "../../rough";
import { MAP_LINK_SIZE } from "../MapLink";
import { RotatedShape } from "./RotatedShape";

const EPSILON = 5;

export function getRotationCenterOfBoundingBox(
  boundingBox: PIXI.Ellipse | PIXI.Circle | PIXI.Rectangle | PIXI.Polygon
): RRPoint {
  if (
    boundingBox instanceof PIXI.Circle ||
    boundingBox instanceof PIXI.Ellipse
  ) {
    return { x: boundingBox.x, y: boundingBox.y };
  } else if (boundingBox instanceof PIXI.Rectangle) {
    return {
      x: boundingBox.x + boundingBox.width / 2,
      y: boundingBox.y + boundingBox.height / 2,
    };
  } else if (boundingBox instanceof PIXI.Polygon) {
    const min = { x: Infinity, y: Infinity };
    const max = { x: -Infinity, y: -Infinity };
    for (let i = 0; i < boundingBox.points.length; i++) {
      const value = boundingBox.points[i]!;
      if (i % 2 === 0) {
        min.x = Math.min(min.x, value);
        max.x = Math.max(max.x, value);
      } else {
        min.y = Math.min(min.y, value);
        max.y = Math.max(max.y, value);
      }
    }
    return pointAdd(min, pointScale(pointSubtract(max, min), 0.5));
  } else {
    assertNever(boundingBox);
  }
}

export function getBoundingBoxForMapObject(
  mapObject: RRMapObject,
  assetCollection: EntityCollection<RRAsset>,
  characterCollection: EntityCollection<RRCharacter>,
  exact: boolean
): RotatedShape | null {
  const boundingBox = getLocalBoundingBoxForMapObject(
    mapObject,
    assetCollection,
    characterCollection,
    exact
  );
  if (!boundingBox) {
    return null;
  }

  if (
    boundingBox instanceof PIXI.Rectangle ||
    boundingBox instanceof PIXI.Circle ||
    boundingBox instanceof PIXI.Ellipse
  ) {
    boundingBox.x += mapObject.position.x;
    boundingBox.y += mapObject.position.y;
  } else if (boundingBox instanceof PIXI.Polygon) {
    for (let i = 0; i < boundingBox.points.length; i++) {
      if (i % 2 === 0) {
        boundingBox.points[i] += mapObject.position.x;
      } else {
        boundingBox.points[i] += mapObject.position.y;
      }
    }
  } else {
    assertNever(boundingBox);
  }

  return new RotatedShape(boundingBox, mapObject.rotation);
}

// Returns the bounding box, ignoring rotation and assuming a position of (0, 0).
function getLocalBoundingBoxForMapObject(
  mapObject: RRMapObject,
  assetCollection: EntityCollection<RRAsset>,
  characterCollection: EntityCollection<RRCharacter>,
  exact: boolean
) {
  switch (mapObject.type) {
    case "image": {
      const asset = assetCollection.entities[mapObject.imageAssetId];
      if (!asset || asset.type !== "image") {
        return null;
      }
      return getLocalBoundingBoxForImage(mapObject, asset);
    }
    case "token": {
      const character = characterCollection.entities[mapObject.characterId];
      if (!character) {
        return null;
      }
      return getLocalBoundingBoxForCharacter(character);
    }
    case "polygon":
      return getLocalBoundingBoxForPolygon(mapObject.points);
    case "freehand":
      return getLocalBoundingBoxForFreehand(mapObject.points, exact);
    case "rectangle":
      return getLocalBoundingBoxForRectangle(
        mapObject.size.x,
        mapObject.size.y
      );
    case "ellipse":
      return getLocalBoundingBoxForEllipse(mapObject.size.x, mapObject.size.y);
    case "mapLink":
      return getLocalBoundingBoxForMapLink();
    case "text":
      return getLocalBoundingBoxForText(mapObject.text);
    default:
      assertNever(mapObject);
  }
}

export function getLocalBoundingBoxForMapLink() {
  return getLocalBoundingBoxForEllipse(MAP_LINK_SIZE, MAP_LINK_SIZE);
}

export function getLocalBoundingBoxForText(text: string) {
  const textMetrics = PIXI.TextMetrics.measureText(
    text,
    new PIXI.TextStyle({ fontFamily: roughTextFontFamily })
  );
  return getLocalBoundingBoxForRectangle(textMetrics.width, textMetrics.height);
}

export function getLocalBoundingBoxForImage(
  mapObject: RRMapDrawingImage,
  asset: RRAssetImage
) {
  const scaleFactor = mapObject.height / asset.height;
  const width = asset.width * scaleFactor;
  const height = asset.height * scaleFactor;
  return new PIXI.Rectangle(0, 0, width, height);
}

export function getLocalBoundingBoxForLine(
  w: number,
  h: number,
  exact: boolean
) {
  if (exact) {
    return new PIXI.Polygon([makePoint(0), makePoint(w, h)]);
  } else {
    const perpendicular = pointNormalize(pointLeftRotate({ x: w, y: h }));
    const tl = pointScale(perpendicular, -0.5 * EPSILON);
    const tr = pointAdd(tl, { x: w, y: h });
    const br = pointAdd(tr, pointScale(perpendicular, EPSILON));
    const bl = pointSubtract(br, { x: w, y: h });

    return new PIXI.Polygon([tl, tr, br, bl]);
  }
}

export function getLocalBoundingBoxForCharacter(character: RRCharacter) {
  const d = character.scale * GRID_SIZE;
  return new PIXI.Circle(d / 2, d / 2, d / 2);
}

export function getLocalBoundingBoxForPolygon(points: RRPoint[]) {
  return new PIXI.Polygon([makePoint(0), ...points]);
}

export function getLocalBoundingBoxForFreehand(
  points: RRPoint[],
  exact: boolean
) {
  const thickPoints: RRPoint[] = [];
  points = [{ x: 0, y: 0 }, ...points];

  if (!exact) {
    for (let i = 0; i < points.length - 1; i++) {
      const point = points[i]!;
      const dir = pointSubtract(points[i + 1]!, point);
      const perpendicular = pointNormalize(pointLeftRotate(dir));
      const tl = pointAdd(pointScale(perpendicular, 0.5 * EPSILON), point);
      const tr = pointAdd(tl, dir);
      thickPoints.push(tl);
      thickPoints.push(tr);
    }

    for (let i = points.length - 1; i > 0; i--) {
      const point = points[i]!;
      const dir = pointSubtract(points[i - 1]!, point);
      const perpendicular = pointNormalize(pointLeftRotate(dir));
      const br = pointAdd(pointScale(perpendicular, 0.5 * EPSILON), point);
      const bl = pointAdd(br, dir);
      thickPoints.push(br);
      thickPoints.push(bl);
    }

    return new PIXI.Polygon(thickPoints);
  } else {
    return new PIXI.Polygon([...points, ...points.slice(1, -1).reverse()]);
  }
}

export function getLocalBoundingBoxForRectangle(w: number, h: number) {
  return new PIXI.Rectangle(
    w < 0 ? w : 0,
    h < 0 ? h : 0,
    Math.abs(w),
    Math.abs(h)
  );
}

export function getLocalBoundingBoxForEllipse(w: number, h: number) {
  return new PIXI.Ellipse(w / 2, h / 2, Math.abs(w) / 2, Math.abs(h) / 2);
}
