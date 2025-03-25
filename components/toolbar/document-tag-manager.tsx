"use client"

import React, { useState, useEffect } from 'react'
import { TagIcon, PlusCircle, Settings2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Tag } from "@/lib/extensions/tagging/tag-types"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DocumentTag } from '@/lib/extensions/document-properties/document-properties-types'
import './document-tag-manager.css'

interface DocumentTagManagerProps {
  editor: any // TipTap editor instance
}

export function DocumentTagManager({ editor }: DocumentTagManagerProps) {
  const [documentTags, setDocumentTags] = useState<DocumentTag[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState('#4f46e5') // Default indigo color
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  
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
  ]

  // Get document tags from the editor
  useEffect(() => {
    if (!editor) return

    // Function to fetch document tags
    const fetchDocumentTags = () => {
      // Get document properties node
      let documentProperties = null
      
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'documentProperties') {
          documentProperties = node
          return false // Stop iteration
        }
        return true
      })
      
      if (documentProperties && documentProperties.attrs.tags) {
        setDocumentTags(documentProperties.attrs.tags)
      } else {
        setDocumentTags([])
      }
    }

    // Initial fetch
    fetchDocumentTags()
    
    // Setup transaction listener to update when document changes
    const unsubscribeHandler = editor.on('transaction', () => {
      fetchDocumentTags()
    })
    
    return () => {
      // Properly check and handle the unsubscribe
      if (editor && editor.off) {
        // If editor.off method exists, use it with the transaction event
        editor.off('transaction');
      }
    }
  }, [editor])

  // Add a new document tag
  const addDocumentTag = () => {
    if (!newTagName.trim() || !editor) return
    
    const newTag: DocumentTag = {
      id: `doc-tag-${Date.now()}`,
      name: newTagName.trim(),
      color: selectedColor,
      isDocumentTag: true
    }
    
    // Add tag to the document properties
    editor.commands.addDocumentTag(newTag)
    
    // Reset input and give visual feedback
    setNewTagName('')
    
    // Flash the tag count to indicate success
    const tagCountEl = document.querySelector('.document-tag-count');
    if (tagCountEl) {
      tagCountEl.classList.add('tag-added-flash');
      setTimeout(() => {
        tagCountEl.classList.remove('tag-added-flash');
      }, 1000);
    }
  }

  // Remove a document tag
  const removeDocumentTag = (tagId: string) => {
    if (!editor) return
    
    // Remove the tag from document properties
    editor.commands.removeDocumentTag(tagId)
  }

  // Handle key press events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addDocumentTag()
    }
  }

  // Toggle the properties panel expanded/collapsed state
  const togglePropertiesPanel = () => {
    if (!editor) return
    
    editor.commands.togglePropertiesPanelExpanded()
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="text-xs gap-1"
        onClick={togglePropertiesPanel}
        title="Toggle properties panel"
        aria-label="Toggle properties panel"
      >
        <Settings2 className="h-3.5 w-3.5" />
        <span>Properties</span>
      </Button>
      
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant={documentTags.length > 0 ? "default" : "outline"}
            size="sm" 
            className={`text-xs gap-1 transition-all duration-300 ${documentTags.length > 0 ? 'bg-primary/20 hover:bg-primary/30 text-primary hover:text-primary' : ''}`}
            title="Manage document tags"
            aria-label="Manage document tags"
            aria-expanded={isPopoverOpen}
          >
            <TagIcon className="h-3.5 w-3.5" />
            <span>Document Tags</span>
            {documentTags.length > 0 && (
              <span className="document-tag-count ml-1 px-1.5 py-0.5 bg-primary/20 text-primary rounded-full text-[10px] transition-all">
                {documentTags.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="end" side="bottom" sideOffset={5}>
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Document Tags</h3>
            
            {/* Tag input */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Add new tag..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full h-8 px-3 text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                  aria-label="New tag name"
                  id="new-tag-input"
                />
              </div>
              
              <div className="relative">
                <button
                  className="h-8 w-8 flex items-center justify-center border border-input rounded-md"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  style={{ backgroundColor: selectedColor + '15' }}
                  aria-label="Select tag color"
                  aria-haspopup="true"
                  aria-expanded={showColorPicker}
                >
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: selectedColor }}
                  ></div>
                </button>
                
                {showColorPicker && (
                  <div className="absolute right-0 top-full mt-1 p-2 bg-background border border-border rounded-md shadow-lg grid grid-cols-7 gap-1 z-10">
                    {colors.map((color) => (
                      <button
                        key={color}
                        className="h-4 w-4 rounded-full hover:opacity-90 transition-opacity hover:scale-110"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          setSelectedColor(color);
                          setShowColorPicker(false);
                        }}
                        aria-label={`Select color ${color}`}
                        title={`Select color ${color}`}
                      ></button>
                    ))}
                  </div>
                )}
              </div>
              
              <Button 
                size="sm" 
                className="h-8"
                disabled={!newTagName.trim()}
                onClick={addDocumentTag}
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1" />
                <span>Add</span>
              </Button>
            </div>
            
            {/* Existing tags */}
            {documentTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {documentTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="document-tag-chip flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-all hover:shadow-sm"
                    style={{ backgroundColor: tag.color + '15', borderLeft: `2px solid ${tag.color}` }}
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full transition-transform"
                      style={{ backgroundColor: tag.color }}
                    ></div>
                    <span>{tag.name}</span>
                    <button
                      className="ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-full p-0.5 transition-colors"
                      onClick={() => removeDocumentTag(tag.id)}
                      aria-label={`Remove tag ${tag.name}`}
                      title={`Remove tag ${tag.name}`}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="10" 
                        height="10" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="sr-only">Remove tag {tag.name}</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2 text-xs text-muted-foreground text-center">
                No document tags added yet
              </div>
            )}
            
            {/* Help text */}
            <div className="pt-1 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Document tags apply to the entire document and appear in the properties panel.
              </p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
