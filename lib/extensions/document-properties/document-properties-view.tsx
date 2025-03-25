import React, { useState, useEffect } from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { ChevronDown, ChevronRight, Tag as TagIcon, PlusCircle, X } from 'lucide-react';
import { DocumentTag } from './document-properties-types';
import './document-properties.css';

export const DocumentPropertiesView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  editor,
}) => {
  const { tags = [], isExpanded = true, title = '', author = '' } = node.attrs;
  const [isEditing, setIsEditing] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#4f46e5'); // Default indigo color
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Available colors (same as inline tag colors for consistency)
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
  
  // Ensure panel stays expanded when actively editing
  useEffect(() => {
    if (isEditing && !isExpanded) {
      updateAttributes({ isExpanded: true });
    }
  }, [isEditing, isExpanded, updateAttributes]);
  
  // Toggle panel expanded/collapsed state
  const toggleExpanded = () => {
    updateAttributes({ isExpanded: !isExpanded });
  };
  
  // Add a new document tag
  const addTag = () => {
    if (!newTagName.trim()) return;
    
    const newTag: DocumentTag = {
      id: `doc-tag-${Date.now()}`,
      name: newTagName.trim(),
      color: selectedColor,
    };
    
    updateAttributes({
      tags: [...tags, newTag],
      updatedAt: new Date().toISOString(),
    });
    
    // Reset inputs
    setNewTagName('');
    setIsEditing(false);
  };
  
  // Remove a document tag
  const removeTag = (tagId: string) => {
    updateAttributes({
      tags: tags.filter((tag: DocumentTag) => tag.id !== tagId),
      updatedAt: new Date().toISOString(),
    });
  };
  
  // Handle key press events for tag input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      setNewTagName('');
      setShowColorPicker(false);
    }
  };
  
  // Don't allow the node to be deleted with standard deletion commands
  const handleKeyDownOnNode = (e: React.KeyboardEvent) => {
    // Prevent Backspace/Delete from deleting the entire node
    if (e.key === 'Backspace' || e.key === 'Delete') {
      // Only prevent default if this would delete the node
      const { state } = editor.view;
      const { selection } = state;
      const { empty, from, to } = selection;
      
      // If the selection spans the entire node or the selection is at the 
      // beginning of the document with Backspace, prevent deletion
      if ((!empty && (from === 0 || to === state.doc.content.size)) || 
          (e.key === 'Backspace' && from === 0)) {
        e.preventDefault();
      }
    }
  };
  
  return (
    <NodeViewWrapper className="document-properties-wrapper" onKeyDown={handleKeyDownOnNode}>
      <div className={`document-properties ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div 
          className="document-properties-header" 
          onClick={() => !isEditing && toggleExpanded()}
        >
          <div className="flex items-center">
            {isExpanded ? 
              <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            }
            <span className="text-sm font-medium ml-1">Document Properties</span>
          </div>
          
          {/* Tag count badge */}
          {tags.length > 0 && (
            <div className="tag-badge" onClick={e => e.stopPropagation()}>
              <TagIcon className="h-3 w-3" />
              <span>{tags.length}</span>
            </div>
          )}
        </div>
        
        {isExpanded && (
          <div className="document-properties-content">
            {/* Tag list */}
            <div className="document-tags-section">
              <div className="section-header">
                <TagIcon className="h-3.5 w-3.5" />
                <span>Tags</span>
              </div>
              
              <div className="tag-list">
                {tags.length > 0 ? (
                  <div className="tag-chips">
                    {tags.map((tag: DocumentTag) => (
                      <div 
                        key={tag.id} 
                        className="tag-chip"
                        style={{ backgroundColor: `${tag.color}15` }}
                      >
                        <div 
                          className="color-dot" 
                          style={{ backgroundColor: tag.color }}
                        />
                        <span>{tag.name}</span>
                        <button
                          className="remove-tag"
                          onClick={() => removeTag(tag.id)}
                          title="Remove tag"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-tags">No tags</div>
                )}
                
                {isEditing ? (
                  <div className="tag-input-container">
                    <div className="tag-input-row">
                      <input
                        type="text"
                        value={newTagName}
                        onChange={e => setNewTagName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Tag name..."
                        autoFocus
                        className="tag-name-input"
                      />
                      
                      <div className="tag-color-picker">
                        <button
                          className="color-button"
                          onClick={() => setShowColorPicker(!showColorPicker)}
                          style={{ backgroundColor: `${selectedColor}15` }}
                        >
                          <div
                            className="color-preview"
                            style={{ backgroundColor: selectedColor }}
                          />
                        </button>
                        
                        {showColorPicker && (
                          <div className="color-palette">
                            {colors.map(color => (
                              <button
                                key={color}
                                className="color-option"
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                  setSelectedColor(color);
                                  setShowColorPicker(false);
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="tag-actions">
                        <button
                          className="add-button"
                          onClick={addTag}
                          disabled={!newTagName.trim()}
                        >
                          Add
                        </button>
                        <button
                          className="cancel-button"
                          onClick={() => {
                            setIsEditing(false);
                            setNewTagName('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    className="add-tag-button"
                    onClick={() => setIsEditing(true)}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Add Tag</span>
                  </button>
                )}
              </div>
            </div>
            
            {/* We could add more properties sections here in future phases */}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
