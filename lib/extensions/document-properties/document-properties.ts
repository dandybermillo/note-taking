import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DocumentPropertiesView } from './document-properties-view';
import { DocumentPropertiesOptions, DocumentTag } from './document-properties-types';

export const DocumentPropertiesNode = Node.create<DocumentPropertiesOptions>({
  name: 'documentProperties',
  
  // This node should be at the top of the document
  group: 'block',
  
  // It should be selectable but not draggable or copyable
  selectable: true,
  draggable: false,
  
  // It's a singleton - only one per document
  defining: true,
  
  // Add attributes for document metadata
  addAttributes() {
    return {
      tags: {
        default: [],
        parseHTML: element => {
          const tagsData = element.getAttribute('data-tags');
          try {
            return tagsData ? JSON.parse(tagsData) : [];
          } catch (e) {
            console.error('Failed to parse document tags', e);
            return [];
          }
        },
        renderHTML: attributes => {
          if (!attributes.tags || !attributes.tags.length) return {};
          return {
            'data-tags': JSON.stringify(attributes.tags),
          };
        },
      },
      // Additional document metadata attributes
      title: {
        default: '',
      },
      author: {
        default: '',
      },
      createdAt: {
        default: new Date().toISOString(),
      },
      updatedAt: {
        default: new Date().toISOString(),
      },
      // Control the visibility state of properties panel
      isExpanded: {
        default: true,
      },
    };
  },
  
  // Parse from HTML
  parseHTML() {
    return [
      {
        tag: 'div[data-type="document-properties"]',
        priority: 100, // High priority to ensure it's parsed first
      },
    ];
  },
  
  // Render to HTML
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        { 'data-type': 'document-properties', class: 'document-properties' },
        HTMLAttributes
      ),
      0, // Content placeholder for nodeview
    ];
  },
  
  // Add custom commands
  addCommands() {
    return {
      // Set document properties
      updateDocumentProperties: attributes => ({ commands }) => {
        // Find if properties node already exists at the start
        const { state } = this.editor;
        let propertiesNodePos = -1;
        
        state.doc.descendants((node, pos) => {
          if (node.type.name === 'documentProperties') {
            propertiesNodePos = pos;
            return false; // Stop iteration
          }
          return true;
        });
        
        // If properties node exists, update it
        if (propertiesNodePos >= 0) {
          return commands.updateAttributes('documentProperties', attributes);
        }
        
        // Otherwise, insert at the beginning of the document
        return commands.insertContentAt(0, {
          type: 'documentProperties',
          attrs: attributes,
        });
      },
      
      // Toggle properties panel expanded/collapsed state
      togglePropertiesPanelExpanded: () => ({ commands, state }) => {
        let propertiesNode = null;
        let propertiesNodePos = -1;
        
        state.doc.descendants((node, pos) => {
          if (node.type.name === 'documentProperties') {
            propertiesNode = node;
            propertiesNodePos = pos;
            return false; // Stop iteration
          }
          return true;
        });
        
        if (propertiesNode) {
          const currentIsExpanded = propertiesNode.attrs.isExpanded;
          return commands.updateAttributes('documentProperties', {
            isExpanded: !currentIsExpanded,
          });
        }
        
        return false;
      },
      
      // Add a tag to document-level tags
      addDocumentTag: (tag: DocumentTag) => ({ commands, state }) => {
        // Find properties node
        let propertiesNode = null;
        
        state.doc.descendants((node, pos) => {
          if (node.type.name === 'documentProperties') {
            propertiesNode = node;
            return false; // Stop iteration
          }
          return true;
        });
        
        if (propertiesNode) {
          // Get existing tags and add the new one if it doesn't exist already
          const currentTags = propertiesNode.attrs.tags || [];
          
          // Check if tag with same ID already exists
          const tagExists = currentTags.some((t: DocumentTag) => t.id === tag.id);
          
          if (!tagExists) {
            const newTags = [...currentTags, tag];
            return commands.updateAttributes('documentProperties', {
              tags: newTags,
              updatedAt: new Date().toISOString(),
            });
          }
        } else {
          // If no properties node exists, create one with the tag
          return commands.insertContentAt(0, {
            type: 'documentProperties',
            attrs: {
              tags: [tag],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          });
        }
        
        return false;
      },
      
      // Remove a tag from document-level tags
      removeDocumentTag: (tagId: string) => ({ commands, state }) => {
        // Find properties node
        let propertiesNode = null;
        
        state.doc.descendants((node, pos) => {
          if (node.type.name === 'documentProperties') {
            propertiesNode = node;
            return false; // Stop iteration
          }
          return true;
        });
        
        if (propertiesNode) {
          // Filter out the tag with the given ID
          const currentTags = propertiesNode.attrs.tags || [];
          const newTags = currentTags.filter((t: DocumentTag) => t.id !== tagId);
          
          return commands.updateAttributes('documentProperties', {
            tags: newTags,
            updatedAt: new Date().toISOString(),
          });
        }
        
        return false;
      },
      
      // Get all document tags
      getDocumentTags: () => ({ state }) => {
        // Find properties node
        let propertiesNode = null;
        
        state.doc.descendants((node, pos) => {
          if (node.type.name === 'documentProperties') {
            propertiesNode = node;
            return false; // Stop iteration
          }
          return true;
        });
        
        if (propertiesNode) {
          return propertiesNode.attrs.tags || [];
        }
        
        return [];
      },
    };
  },
  
  // Use React component for rendering
  addNodeView() {
    return ReactNodeViewRenderer(DocumentPropertiesView);
  },
});
