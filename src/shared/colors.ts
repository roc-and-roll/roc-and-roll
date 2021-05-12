import { randomBetweenInclusive } from "./random";

export const colors = [
  // Generated with https://medialab.github.io/iwanthue/
  "#c49fa6",
  "#a74d63",
  "#dd385d",
  "#df7f81",
  "#b03f36",
  "#e14427",
  "#7e5f56",
  "#e77e5e",
  "#9f5c3c",
  "#ce7225",
  "#d9ae7f",
  "#d9a83c",
  "#836a2a",
  "#d6db33",
  "#8f9c38",
  "#cddb66",
  "#7c855b",
  "#bed994",
  "#78d747",
  "#c9d7c1",
  "#448235",
  "#64d784",
  "#5ca98e",
  "#457264",
  "#6be6c9",
  "#72c4d9",
  "#507691",
  "#5788cf",
  "#bbb8de",
  "#5661d8",
  "#8f7ad0",
  "#8e44de",
  "#765d87",
  "#9445ab",
  "#de96e3",
  "#d64cce",
  "#ba6ba5",
  "#a23372",
  "#e44598",
  "#e68eb1",
];

export function randomColor() {
  return colors[randomBetweenInclusive(0, colors.length - 1)]!;
}
