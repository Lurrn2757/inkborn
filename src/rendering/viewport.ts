/** Design coordinates never depend on the browser's size or device pixel ratio. */
export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;
export const GAME_ASPECT = GAME_WIDTH / GAME_HEIGHT;
export function fitGameViewport(width: number, height: number) {
  const scale = Math.max(0, Math.min(width / GAME_WIDTH, height / GAME_HEIGHT));
  return { width: GAME_WIDTH * scale, height: GAME_HEIGHT * scale, left: (width - GAME_WIDTH * scale) / 2, top: (height - GAME_HEIGHT * scale) / 2, scale };
}
export function logicalPoint(x: number, y: number, width: number, height: number) {
  const fit = fitGameViewport(width, height);
  return { x: fit.scale ? (x - fit.left) / fit.scale : 0, y: fit.scale ? (y - fit.top) / fit.scale : 0 };
}
