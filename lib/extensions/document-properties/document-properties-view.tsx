import React, { useState, useEffect } from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { 
  ChevronDown, 
  ChevronRight, 
  Tag as TagIcon, 
  PlusCircle, 
  X, 
  FileText, 
  Calendar, 
  User,
  Info
} from 'lucide-react';
import { DocumentTag } from './document-properties-types';
import './document-properties.css';

export const DocumentPropertiesView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  editor,
}) => {
  const { 
    tags = [], 
    isExpanded = true, 
    title = '', 
    author = '',
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  } = node.attrs;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [titleInput, setTitleInput] = useState(title);
  const [authorInput, setAuthorInput] = useState(author);
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
  
  // Start editing a specific field
  const startEditing = (field: string) => {
    setEditingField(field);
    if (field === 'title') {
      setTitleInput(title);
    } else if (field === 'author') {
      setAuthorInput(author);
    }
  };
  
  // Save field value
  const saveField = () => {
    if (editingField === 'title') {
      updateAttributes({ 
        title: titleInput,
        updatedAt: new Date().toISOString()
      });
    } else if (editingField === 'author') {
      updateAttributes({ 
        author: authorInput,
        updatedAt: new Date().toISOString()
      });
    }
    
    setEditingField(null);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      // Check if date is valid before formatting
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // If date is invalid, return current time
        return new Date().toLocaleString();
      }
      return date.toLocaleString();
    } catch (e) {
      console.error('Error formatting date:', e);
      // Return current time as fallback
      return new Date().toLocaleString();
    }
  };
  
  // Add a new document tag
  const addTag = () => {
    if (!newTagName.trim()) return;
    
    try {
      // Generate a unique ID that's not already in use
      const timestamp = Date.now();
      const tagId = `doc-tag-${timestamp}`;
      
      // Ensure uniqueness by checking existing tags
      const existingIds = tags.map(tag => tag.id);
      let uniqueId = tagId;
      let counter = 1;
      
      while (existingIds.includes(uniqueId)) {
        uniqueId = `${tagId}-${counter}`;
        counter++;
      }
      
      const newTag: DocumentTag = {
        id: uniqueId,
        name: newTagName.trim().substring(0, 50), // Limit name length
        color: selectedColor,
      };
      
      // Check for duplicate tag names
      const isDuplicate = tags.some(tag => 
        tag.name.toLowerCase() === newTag.name.toLowerCase()
      );
      
      if (isDuplicate) {
        // Append a number to make it unique
        newTag.name = `${newTag.name} (${counter})`;
      }
      
      updateAttributes({
        tags: [...tags, newTag],
        updatedAt: new Date().toISOString(),
      });
      
      // Reset inputs
      setNewTagName('');
      setIsEditing(false);
    } catch (error) {
      console.error('Error adding tag:', error);
      // Show an error message to the user
      alert('There was an error adding the tag. Please try again.');
    }
  };
  
  // Remove a document tag
  const removeTag = (tagId: string) => {
    try {
      // Verify the tag exists
      const tagExists = tags.some(tag => tag.id === tagId);
      
      if (!tagExists) {
        console.warn(`Attempted to remove non-existent tag with ID: ${tagId}`);
        return;
      }
      
      // Filter out the tag and update
      updateAttributes({
        tags: tags.filter((tag: DocumentTag) => tag.id !== tagId),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error removing tag:', error);
    }
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
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              !isEditing && toggleExpanded();
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-label="Toggle document properties panel"
        >
          <div className="flex items-center">
            {isExpanded ? 
              <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            }
            <span className="text-sm font-medium ml-1">Document Properties</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Title preview if set */}
            {title && !isExpanded && (
              <div className="title-preview">
                {title}
              </div>
            )}
            
            {/* Tag count badge */}
            {tags.length > 0 && (
              <div className="tag-badge" onClick={e => e.stopPropagation()}>
                <TagIcon className="h-3 w-3" />
                <span>{tags.length}</span>
              </div>
            )}
          </div>
        </div>
        
        {isExpanded && (
          <div className="document-properties-content">
            {/* Document title */}
            <div className="property-section">
              <div className="section-header">
                <FileText className="h-3.5 w-3.5" />
                <span>Title</span>
              </div>
              
              <div className="property-value">
                {editingField === 'title' ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      value={titleInput}
                      onChange={e => setTitleInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveField()}
                      onBlur={saveField}
                      placeholder="Enter document title..."
                      autoFocus
                      className="property-input"
                    />
                  </div>
                ) : (
                  <div 
                    className="editable-value"
                    onClick={() => startEditing('title')}
                  >
                    {title || <span className="placeholder-text">Add a title...</span>}
                  </div>
                )}
              </div>
            </div>
            
            {/* Author field */}
            <div className="property-section">
              <div className="section-header">
                <User className="h-3.5 w-3.5" />
                <span>Author</span>
              </div>
              
              <div className="property-value">
                {editingField === 'author' ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      value={authorInput}
                      onChange={e => setAuthorInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveField()}
                      onBlur={saveField}
                      placeholder="Enter author name..."
                      autoFocus
                      className="property-input"
                    />
                  </div>
                ) : (
                  <div 
                    className="editable-value"
                    onClick={() => startEditing('author')}
                  >
                    {author || <span className="placeholder-text">Add an author...</span>}
                  </div>
                )}
              </div>
            </div>
            
            {/* Date information */}
            <div className="property-section">
              <div className="section-header">
                <Calendar className="h-3.5 w-3.5" />
                <span>Dates</span>
              </div>
              
              <div className="dates-container">
                <div className="date-item">
                  <span className="date-label">Created:</span>
                  <span className="date-value">{formatDate(createdAt)}</span>
                </div>
                <div className="date-item">
                  <span className="date-label">Updated:</span>
                  <span className="date-value">{formatDate(updatedAt)}</span>
                </div>
              </div>
            </div>
            
            {/* Tag list */}
            <div className="property-section">
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
                          title={`Remove tag "${tag.name}"`}
                          aria-label={`Remove tag "${tag.name}"`}
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">Remove tag {tag.name}</span>
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
                          aria-label="Select tag color"
                          aria-expanded={showColorPicker}
                          aria-haspopup="true"
                        >
                          <div
                            className="color-preview"
                            style={{ backgroundColor: selectedColor }}
                          />
                          <span className="sr-only">Choose color</span>
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
                                aria-label={`Select color ${color}`}
                                title={`Select color ${color}`}
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
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
