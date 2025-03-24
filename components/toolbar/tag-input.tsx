import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Plus } from 'lucide-react';
import { Tag } from '@/lib/extensions/tagging/tag-types';

interface TagInputProps {
  onTagSelect: (tag: Tag) => void;
  onCancel: () => void;
  existingTags: Tag[];
  position: { top: number; left: number };
}

export const TagInput: React.FC<TagInputProps> = ({
  onTagSelect,
  onCancel,
  existingTags,
  position,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedColor, setSelectedColor] = useState('#4f46e5'); // Default indigo color
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [selectedTagIndex, setSelectedTagIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Available colors
  const colors = [
    '#4f46e5', // indigo
    '#2563eb', // blue
    '#4338ca', // purple
    '#7c3aed', // violet
    '#db2777', // pink
    '#e11d48', // rose
    '#dc2626', // red
    '#ea580c', // orange
    '#d97706', // amber
    '#65a30d', // lime
    '#16a34a', // green
    '#0d9488', // teal
    '#0284c7', // sky
    '#6b7280', // gray
  ];
  
  // Filter tags based on input
  useEffect(() => {
    if (inputValue.trim() === '') {
      setFilteredTags(existingTags);
    } else {
      const filtered = existingTags.filter(tag => 
        tag.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredTags(filtered);
    }
    
    // Reset selected index when input changes
    setSelectedTagIndex(-1);
  }, [inputValue, existingTags]);
  
  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Handle tag creation
  const handleCreateTag = () => {
    if (inputValue.trim() === '') return;
    
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      name: inputValue.trim(),
      color: selectedColor,
    };
    
    onTagSelect(newTag);
  };
  
  // Handle tag selection from existing tags
  const handleSelectExistingTag = (tag: Tag) => {
    onTagSelect(tag);
  };
  
  // Handle key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cancel on escape
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    
    // Create tag on enter if there's input text
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // If a tag is selected in the dropdown, select it
      if (selectedTagIndex >= 0 && selectedTagIndex < filteredTags.length) {
        handleSelectExistingTag(filteredTags[selectedTagIndex]);
      } else {
        // Otherwise create a new tag
        handleCreateTag();
      }
      return;
    }
    
    // Navigate through filtered tags
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedTagIndex(prev => 
        prev < filteredTags.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedTagIndex(prev => (prev > 0 ? prev - 1 : 0));
    }
  };
  
  return (
    <div
      className="absolute z-50 bg-background/95 backdrop-blur-sm border border-border rounded-md shadow-lg p-2 min-w-64 animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Add Tag</h3>
        <button
          className="p-1 rounded-full hover:bg-muted/80 transition-colors"
          onClick={onCancel}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      
      <div className="relative">
        <div className="flex gap-2 mb-2">
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter tag name..."
              className="w-full p-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          
          <div className="relative">
            <button
              className="p-2 border border-input rounded-md h-full"
              onClick={() => setShowColorPicker(!showColorPicker)}
              style={{ backgroundColor: selectedColor + '15' }}
            >
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: selectedColor }}
              ></div>
            </button>
            
            {/* Color picker */}
            {showColorPicker && (
              <div className="absolute right-0 mt-1 p-2 bg-background/95 backdrop-blur-sm border border-border rounded-md shadow-lg grid grid-cols-7 gap-1 z-10">
                {colors.map((color) => (
                  <button
                    key={color}
                    className="h-5 w-5 rounded-full cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setSelectedColor(color);
                      setShowColorPicker(false);
                    }}
                  ></button>
                ))}
              </div>
            )}
          </div>
          
          <button
            className="p-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
            onClick={handleCreateTag}
            disabled={inputValue.trim() === ''}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        
        {/* Existing tags */}
        {filteredTags.length > 0 && (
          <div className="max-h-32 overflow-y-auto border border-border rounded-md">
            {filteredTags.map((tag, index) => (
              <div
                key={tag.id}
                className={`flex items-center justify-between p-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                  index === selectedTagIndex ? 'bg-primary/10' : ''
                }`}
                onClick={() => handleSelectExistingTag(tag)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  ></div>
                  <span className="text-sm">{tag.name}</span>
                </div>
                <Check className="h-3.5 w-3.5 text-primary/80 opacity-0 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
