export interface ToolbarItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  action: () => void;
  isVisible: (context: ToolbarContext) => boolean;
  isPrimary?: boolean;
  disabled?: boolean;
}

export interface ToolbarPosition {
  top: number;
  left: number;
  placement?: 'top' | 'right' | 'bottom' | 'left';
}

export interface ToolbarOptions {
  items: ToolbarItem[];
  position: ToolbarPosition;
  showExpansion?: boolean;
  animationDuration?: number;
}

export interface ToolbarContext {
  isTextSelected: boolean;
  selectionText?: string;
  cursorPosition?: { x: number, y: number };
}
