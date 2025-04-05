import { Mark, mergeAttributes } from '@tiptap/core';
import './tag-inline-ui.css';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const TagMark = Mark.create({
  name: 'tag',
  
  // Make tag inclusive to ensure it expands to include new content
  inclusive: true,
  
  // Remove exclusions to strengthen tag retention
  excludes: '',
  
  // Make tag spanning to allow it to cross node boundaries
  spanning: true,
  
  // Add priority to ensure it doesn't get removed accidentally
  priority: 1000,
  
  addOptions() {
    return {
      HTMLAttributes: {},
      // Add persistent mode to make mark harder to remove
      persistent: true,
    }
  },
  
  // Override core method to make tag more persistent
  addKeyboardShortcuts() {
    return {
      // Block any keyboard shortcuts that might remove the mark
      'Mod-z': () => {
        // Always allow undo, but prevent it from removing tag marks
        const { view, state } = this.editor;
        const tagMarks = [];
        
        // First collect all tag marks in the document
        state.doc.descendants((node, pos) => {
          if (node.isText && node.marks.length) {
            const marks = node.marks.filter(m => m.type.name === 'tag');
            if (marks.length) {
              tagMarks.push({
                marks,
                from: pos,
                to: pos + node.nodeSize,
                text: node.text
              });
            }
          }
          return true;
        });
        
        // Execute the default undo command but don't return it
        const undoCommand = () => {
          return false; // Let the command propagate
        };
        
        // After undo completes, restore any missing tag marks
        setTimeout(() => {
          try {
            const tr = this.editor.state.tr;
            let hasChanges = false;
            
            // Check which tags are now missing
            for (const tagInfo of tagMarks) {
              // Search for the text in the new document state
              let found = false;
              
              this.editor.state.doc.descendants((node, pos) => {
                if (found || !node.isText) return true;
                
                // Look for matching text
                if (node.text && node.text.includes(tagInfo.text)) {
                  const startIndex = node.text.indexOf(tagInfo.text);
                  if (startIndex >= 0) {
                    const from = pos + startIndex;
                    const to = from + tagInfo.text.length;
                    
                    // Check if the tag mark still exists at this position
                    const hasMark = this.editor.state.doc.rangeHasMark(from, to, this.type);
                    
                    if (!hasMark) {
                      // Restore the missing tag marks
                      for (const mark of tagInfo.marks) {
                        tr.addMark(from, to, mark);
                      }
                      hasChanges = true;
                    }
                    
                    found = true;
                    return false;
                  }
                }
                
                return true;
              });
            }
            
            // Apply the changes
            if (hasChanges) {
              tr.setMeta('preserveTagMarks', true);
              tr.setMeta('forcePreserveTagMarks', true);
              this.editor.view.dispatch(tr);
            }
          } catch (error) {
            console.error('Error restoring tags after undo:', error);
          }
        }, 10);
        
        return undoCommand();
      }
    };
  },
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tag-cursor-position'),
        // Store cursor position before each transaction
        appendTransaction(transactions, oldState, newState) {
          if (transactions.some(tr => tr.docChanged)) {
            const oldSelection = oldState.selection;
            const newSelection = newState.selection;
            
            // If selection changed during a doc change, we need to ensure it's valid
            if (oldSelection.from !== newSelection.from || oldSelection.to !== newSelection.to) {
              // Check if we're inside a tag mark
              const $pos = newState.doc.resolve(newSelection.from);
              const marks = $pos.marks();
              const hasMark = marks.some(mark => mark.type.name === 'tag');
              
              if (hasMark) {
                // For tags, make sure cursor is placed appropriately
                return newState.tr.setSelection(newSelection);
              }
            }
          }
          return null;
        }
      })
    ];
  },
  
  addAttributes() {
    return {
      id: {
        default: null,
      },
      tagId: {
        default: null,
      },
      name: {
        default: null,
        parseHTML: element => element.getAttribute('data-tag-name'),
        renderHTML: attributes => {
          if (!attributes.name) return {};
          return { 'data-tag-name': attributes.name };
        },
      },
      color: {
        default: '#3366FF',
        parseHTML: element => element.getAttribute('data-tag-color'),
        renderHTML: attributes => {
          // Set both attribute and style for better support
          if (!attributes.color) return {};
          
          return {
            'data-tag-color': attributes.color,
            'style': `--tag-color: ${attributes.color}; border-bottom-color: ${attributes.color};`
          };
        },
      },
      description: {
        default: null,
        parseHTML: element => element.getAttribute('data-tag-description'),
        renderHTML: attributes => {
          if (!attributes.description) return {};
          return { 'data-tag-description': attributes.description };
        },
      },
      content: {
        default: '',
      },
      contentBefore: {
        default: '',
      },
      contentAfter: {
        default: '',
      },
      lastUpdated: {
        default: null,
        parseHTML: element => element.getAttribute('data-last-updated'),
        renderHTML: attributes => {
          if (!attributes.lastUpdated) {
            attributes.lastUpdated = new Date().toISOString();
          }
          return { 'data-last-updated': attributes.lastUpdated };
        },
      },
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'span[data-tag]',
      },
      // Also parse mark tags with data-type=tag for backward compatibility
      {
        tag: 'mark[data-type="tag"]',
      },
      // Support legacy tagged spans
      {
        tag: 'span.tagged-text',
      }
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    // Extract color components for CSS variable
    const color = HTMLAttributes.color || '#3366FF';
    
    // Convert hex to RGB for CSS variable (for background opacity)
    let r = 51, g = 102, b = 255; // Default blue
    
    if (color.startsWith('#') && color.length >= 7) {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    }
    
    // Add inline styles for better compatibility and persistence
    const inlineStyle = `
      position: relative;
      background-color: rgba(${r}, ${g}, ${b}, 0.15) !important;
      border-bottom: 2px solid ${color} !important;
      border-bottom-color: ${color} !important;
      padding-bottom: 1px;
      text-decoration: none !important;
      z-index: 10;
      --tag-color: ${r}, ${g}, ${b};
      display: inline !important;
    `.trim();
    
    // Add a timestamp to track when the mark was last rendered
    const updatedTimestamp = new Date().toISOString();
    
    // Create a unique ID for this tag instance for DOM manipulation
    const tagId = HTMLAttributes.id || `tag-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const tagName = HTMLAttributes.name || 'Tag';
    const rangeId = HTMLAttributes.id;
    
    // Generate data attributes for the tag element without the mouseover handler
    return ['span', mergeAttributes(
      {
        'data-tag': true,
        'data-tag-id': tagId,
        'data-tag-name': HTMLAttributes.name,
        'data-tag-color': color,
        'data-tag-range-id': rangeId,
        'data-last-updated': updatedTimestamp,
        'style': inlineStyle,
        'class': 'tagged-text',
        // Remove onmouseenter event handler
        // Add tabindex to make the element focusable for accessibility
        'tabindex': '0',
        // Add ARIA attributes for accessibility
        'role': 'mark',
        'aria-label': `${tagName} tag`,
      },
      HTMLAttributes
    )]
  },
  
  // Add support for text tracking
  onUpdate() {
    // This hook is called when the document updates
    // We can add logic here to handle tag position updates if needed
  },
  
  addStorage() {
    return {
      // Add any mark-specific storage if needed
    };
  },
});