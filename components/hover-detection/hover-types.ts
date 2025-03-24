export interface HoverPosition {
  x: number;
  y: number;
}

export interface HoverState {
  isHovering: boolean;
  duration: number;
  position: HoverPosition;
}

export interface HoverOptions {
  delayMs: number;
  hoverZoneSize: number;
  containerId?: string;
}

export type HoverCallback = (state: HoverState) => void;
