import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { ToolbarItem, ToolbarPosition, ToolbarContext } from './toolbar-types';

interface ToolbarProps {
  items: ToolbarItem[];
  position: ToolbarPosition;
  context: ToolbarContext;
  showExpansion?: boolean;
  onClose?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  items,
  position,
  context,
  showExpansion = true,
  onClose,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  // Filter items based on visibility condition
  const visibleItems = items.filter(item => item.isVisible(context));
  
  // Split items into primary and secondary
  const primaryItems = visibleItems.filter(item => item.isPrimary !== false);
  const secondaryItems = visibleItems.filter(item => item.isPrimary === false);
  
  // Get items to display based on expansion state
  const displayItems = expanded ? visibleItems : primaryItems;
  
  // Check if we have secondary items to show in expansion
  const hasSecondaryItems = secondaryItems.length > 0;
  
  // Update toolbar height after render
  useEffect(() => {
    if (toolbarRef.current) {
      setToolbarHeight(toolbarRef.current.offsetHeight);
    }
  }, [displayItems, expanded]);
  
  // Close the toolbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 bg-background/95 backdrop-blur-sm border border-border rounded-md shadow-lg py-1 animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="flex items-center">
        {/* Toolbar Items */}
        <div className="flex items-center gap-0.5 px-1">
          {displayItems.map((item) => (
            <button
              key={item.id}
              className={`p-1.5 rounded hover:bg-muted/80 transition-colors flex items-center gap-1.5 ${
                item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              }`}
              onClick={() => !item.disabled && item.action()}
              disabled={item.disabled}
              title={item.label}
            >
              <div className="text-primary/80">{item.icon}</div>
              <span className="text-xs whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </div>
        
        {/* Expansion Control */}
        {showExpansion && hasSecondaryItems && (
          <div
            className={`p-1 rounded hover:bg-muted/80 transition-colors cursor-pointer border-l border-border/50 ml-1 ${
              expanded ? 'bg-muted/60' : ''
            }`}
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform duration-200 ${
                expanded ? 'rotate-90' : ''
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
};
