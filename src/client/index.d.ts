declare module "react-lag-radar" {
  const component: import("react").ComponentType<{
    frames?: number;
    speed?: number;
    size?: number;
    inset?: number;
  }>;

  export = component;
}
