// Tells TypeScript to treat CSS imports as side-effect modules.
// NativeWind processes these at build time via Metro — no runtime value needed.
declare module "*.css" {}
