export const DRAWING_WIDTH = 1024;
export const DRAWING_HEIGHT = 768;
export type Point = { x: number; y: number; pressure: number };
export type Stroke = { kind: 'stroke'; tool: 'pen' | 'eraser'; color: string; width: number; points: Point[] };
export type DrawingAction = Stroke | { kind: 'clear' };
export type DrawingDocument = { base: string | null; actions: DrawingAction[]; cursor: number };
export type OccupancyMask = { width: number; height: number; cells: number[] };
export type Anchor = { conceptId: string; x: number; y: number; attachmentX: number; attachmentY: number };
export type CreatureAsset = {
  id: string; dataUrl: string; width: number; height: number; hash: string;
  mask: OccupancyMask; anchors: Anchor[];
  bounds: { x: number; y: number; width: number; height: number };
};
export const emptyDrawing = (): DrawingDocument => ({ base: null, actions: [], cursor: 0 });
