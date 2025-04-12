import React, { useRef, useEffect, useState } from 'react';
import { BotIcon, TagIcon, WandIcon, LightbulbIcon } from 'lucide-react';
import { useHoverDetector } from '../hover-detection/hover-detector';
import { HoverState } from '../hover-detection/hover-types';
import { AnnotationPopup } from '../annotation/annotation-popup';
import { AnnotationType } from '@/lib/extensions/annotation/types';

interface AIIconProps {
  position: { top: number; left: number };
  onIconClick: () => void;
  onTagClick?: () => void;
  onAnnotate?: (type: AnnotationType) => void;
  hasSelection?: boolean;
  editorRef: React.RefObject<HTMLElement>;
}

export const AIIcon: React.FC<AIIconProps> = ({
  position,
  onIconClick,
  onTagClick,
  onAnnotate,
  hasSelection = false,
  editorRef,
}) => {
  const [showToolbar, setShowToolbar] = useState(false);
  const [showInsightPopup, setShowInsightPopup] = useState(false);
  const [isHoveringToolbar, setIsHoveringToolbar] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const insightButtonRef = useRef<HTMLButtonElement>(null);
  const [insightPosition, setInsightPosition] = useState({ top: 0, left: 0 });
  
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
  
  // Force toolbar to remain visible when popup is showing
  useEffect(() => {
    if (showInsightPopup) {
      setShowToolbar(true);
    }
  }, [showInsightPopup]);
  
  // Handle hover state changes
  useEffect(() => {
    const removeCallback = addCallback((state: HoverState) => {
      // Only update toolbar visibility if we're not hovering on the toolbar itself
      // and not showing the insight popup
      if (!isHoveringToolbar && !showInsightPopup) {
        setShowToolbar(state.isHovering);
      }
    });
    
    return () => {
      removeCallback();
    };
  }, [addCallback, showInsightPopup, isHoveringToolbar]);
  
  // Add event listeners to track hover state on toolbar
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const handleMouseEnter = () => {
      setIsHoveringToolbar(true);
    };

    const handleMouseLeave = () => {
      setIsHoveringToolbar(false);
      
      // Only hide toolbar if we're not showing the popup and not hovering the icon
      if (!showInsightPopup && !hoverState.isHovering) {
        // Small delay to prevent flickering
        setTimeout(() => {
          setShowToolbar(false);
        }, 100);
      }
    };

    toolbar.addEventListener('mouseenter', handleMouseEnter);
    toolbar.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      toolbar.removeEventListener('mouseenter', handleMouseEnter);
      toolbar.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [toolbarRef, showInsightPopup, hoverState.isHovering]);
  
  // Handle clicks outside to close toolbar/popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if popup isn't showing
      if (!showInsightPopup) return;
      
      // Check if the click is outside both the toolbar and popup
      const isInsideToolbar = toolbarRef.current?.contains(event.target as Node);
      const isInsidePopup = document.querySelector('.annotation-popup')?.contains(event.target as Node);
      const isInsideIcon = iconRef.current?.contains(event.target as Node);
      
      if (!isInsideToolbar && !isInsidePopup && !isInsideIcon) {
        setShowInsightPopup(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInsightPopup]);
  
  // Calculate and update insight popup position whenever the button or popup visibility changes
  useEffect(() => {
    const updatePosition = () => {
      if (insightButtonRef.current) {
        const rect = insightButtonRef.current.getBoundingClientRect();
        setInsightPosition({
          top: rect.bottom,
          left: rect.left + (rect.width / 2),
        });
      }
    };

    // Update position when visibility changes
    if (showInsightPopup) {
      updatePosition();
      // Ensure toolbar is visible when popup is shown
      setShowToolbar(true);
    }

    // Also listen for scroll events to update position
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showInsightPopup]);
  
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
      left: -130, // Center the toolbar (adjusted for new insight button)
    };
  };

  // Toggle insight popup when the lightbulb button is clicked
  const handleInsightButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    
    if (hasSelection) {
      // Calculate position just before showing
      if (insightButtonRef.current) {
        const rect = insightButtonRef.current.getBoundingClientRect();
        setInsightPosition({
          top: rect.bottom,
          left: rect.left + (rect.width / 2),
        });
      }
      setShowInsightPopup(!showInsightPopup);
      setShowToolbar(true); // Always keep toolbar visible when toggling popup
    }
  };
  
  // Prevent event bubbling for button clicks
  const handleButtonClick = (callback?: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (callback) callback();
  };
  
  // Handle annotation selection
  const handleAnnotate = (type: AnnotationType) => {
    if (onAnnotate) {
      onAnnotate(type);
      setShowInsightPopup(false);
    }
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
          ref={toolbarRef}
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
            onClick={handleButtonClick(onIconClick)}
            title="AI assistance"
          >
            <WandIcon className="h-3.5 w-3.5 text-primary/80" />
            <span className="text-xs">Assist</span>
          </button>
          
          {/* Divider */}
          <div className="w-px h-5 bg-border/60" />
          
          {/* Insight Button */}
          <button
            ref={insightButtonRef}
            id="lightbulb-toolbar"
            className={`p-1.5 rounded hover:bg-muted/80 transition-colors flex items-center gap-1.5 ${showInsightPopup ? 'bg-muted' : ''}`}
            title="Add insight to selection"
            disabled={!hasSelection}
            onClick={handleInsightButtonClick}
          >
            <LightbulbIcon className={`h-3.5 w-3.5 ${hasSelection ? 'text-amber-500' : 'text-muted-foreground/40'}`} />
            <span className={`text-xs ${hasSelection ? '' : 'text-muted-foreground/40'}`}>Insight</span>
          </button>
          
          {/* Divider */}
          <div className="w-px h-5 bg-border/60" />
          
          {/* Tag Option */}
          <button
            className="p-1.5 rounded hover:bg-muted/80 transition-colors flex items-center gap-1.5"
            onClick={handleButtonClick(onTagClick)}
            title="Add tag to selection"
            disabled={!hasSelection}
          >
            <TagIcon className={`h-3.5 w-3.5 ${hasSelection ? 'text-primary/80' : 'text-muted-foreground/40'}`} />
            <span className={`text-xs ${hasSelection ? '' : 'text-muted-foreground/40'}`}>Tag</span>
          </button>
        </div>
      )}
      
      {/* Insight Popup */}
      {showInsightPopup && hasSelection && (
        <AnnotationPopup
          position={insightPosition}
          onAnnotate={handleAnnotate}
          onOutsideClick={() => setShowInsightPopup(false)}
        />
      )}
    </div>
  );
};
