export interface ArenaViewProps {
  sprite: {
    dataUrl: string;
    width: number;
    height: number;
    anchors: Array<{ conceptId: string; x: number; y: number; attachmentX: number; attachmentY: number }>;
  };
  crystals: Array<{ id: string; label: string; state: 'stable' | 'corrupted' | 'shattered' | 'unresolved' }>;
  selectedId: string | null;
  event: { id: string; type: 'hit' | 'corrupt' | 'recovery' | 'unresolved' | 'victory' | 'retreat'; conceptId: string | null } | null;
  scene: 'preview' | 'awakening' | 'battle' | 'victory' | 'retreat';
  reducedMotion: boolean;
  ritualIntegrity?: number;
  victoryStyle?: 'dominant' | 'scarred';
  onSelect: (id: string) => void;
  onSceneReady?: () => void;
}

export interface ArenaFrame {
  time: number;
  eventAge: number;
  sceneAge: number;
  selectionAge?: number;
}

export interface ArenaRenderer {
  canvas: HTMLCanvasElement;
  resize: (width: number, height: number) => void;
  render: (props: ArenaViewProps, image: HTMLImageElement | null, frame: ArenaFrame) => void;
  start: (onFrame: () => void) => void;
  destroy: () => void;
}
