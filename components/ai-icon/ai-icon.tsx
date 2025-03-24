import React, { useRef, useEffect, useState } from 'react';
import { BotIcon, TagIcon, WandIcon } from 'lucide-react';
import { useHoverDetector } from '../hover-detection/hover-detector';
import { HoverState } from '../hover-detection/hover-types';

interface AIIconProps {
  position: { top: number; left: number };
  onIconClick: () => void;
  onTagClick?: () => void;
  hasSelection?: boolean;
  editorRef: React.RefObject<HTMLElement>;
}

export const AIIcon: React.FC<AIIconProps> = ({
  position,
  onIconClick,
  onTagClick,
  hasSelection = false,
  editorRef,
}) => {
  const [showToolbar, setShowToolbar] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);
  
  // Use the hover detector
  const { hoverState, setTargetElement, addCallback } = useHoverDetector({
    delayMs: 200,
    hoverZoneSize: 50,
  });
  
  // Set up the target element when the component mounts
  useEffect(() => {
    if (iconRef.current) {
      setTargetElement(iconRef.current);
    }
  }, [setTargetElement]);
  
  // Handle hover state changes
  useEffect(() => {
    const removeCallback = addCallback((state: HoverState) => {
      setShowToolbar(state.isHovering);
    });
    
    return () => {
      removeCallback();
    };
  }, [addCallback]);
  
  // Define the classes for the icon
  const getIconClasses = () => {
    const baseClasses = "absolute z-10 transition-opacity duration-200";
    return hasSelection
      ? `${baseClasses} opacity-80 hover:opacity-100`
      : `${baseClasses} opacity-40 hover:opacity-90`;
  };
  
  // Define the background classes for the icon
  const getIconBgClasses = () => {
    const baseClasses = "rounded-full border border-primary/10 shadow-sm";
    return hasSelection
      ? `${baseClasses} bg-primary/20 dark:bg-primary/30 p-2 ai-icon-pulse-selection`
      : `${baseClasses} bg-primary/5 dark:bg-primary/10 p-1.5 ai-icon-pulse`;
  };
  
  // Define the icon size classes
  const getIconSizeClasses = () => {
    return hasSelection
      ? "h-4 w-4"
      : "h-3.5 w-3.5";
  };
  
  // Get toolbar position relative to the icon
  const getToolbarPosition = () => {
    if (!iconRef.current) return { top: 0, left: 0 };
    
    const iconRect = iconRef.current.getBoundingClientRect();
    
    return {
      top: -40, // Position above the icon
      left: -90, // Center the toolbar
    };
  };
  
  const toolbarPosition = getToolbarPosition();
  
  return (
    <div
      ref={iconRef}
      className={getIconClasses()}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      title={hasSelection ? "AI options for selected text" : "AI assistance"}
    >
      <div className={getIconBgClasses()}>
        <BotIcon 
          className={`${getIconSizeClasses()} text-primary/80`} 
          onClick={onIconClick}
        />
      </div>
      
      {/* Expandable Toolbar */}
      {showToolbar && (
        <div 
          className="absolute bg-background/95 backdrop-blur-sm border border-border rounded-md shadow-md py-1 px-0.5 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200"
          style={{
            top: `${toolbarPosition.top}px`,
            left: `${toolbarPosition.left}px`,
            zIndex: 100,
          }}
        >
          {/* AI Assist Option */}
          <button
            className="p-1.5 rounded hover:bg-muted/80 transition-colors flex items-center gap-1.5"
            onClick={onIconClick}
            title="AI assistance"
          >
            <WandIcon className="h-3.5 w-3.5 text-primary/80" />
            <span className="text-xs">Assist</span>
          </button>
          
          {/* Divider */}
          <div className="w-px h-5 bg-border/60" />
          
          {/* Tag Option */}
          <button
            className="p-1.5 rounded hover:bg-muted/80 transition-colors flex items-center gap-1.5"
            onClick={onTagClick}
            title="Add tag to selection"
            disabled={!hasSelection}
          >
            <TagIcon className={`h-3.5 w-3.5 ${hasSelection ? 'text-primary/80' : 'text-muted-foreground/40'}`} />
            <span className={`text-xs ${hasSelection ? '' : 'text-muted-foreground/40'}`}>Tag</span>
          </button>
        </div>
      )}
    </div>
  );
};
