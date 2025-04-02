import { Mark, mergeAttributes } from '@tiptap/core';
import './tag-inline-ui.css';
import { Plugin } from '@tiptap/pm/state';
import { PluginKey } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';

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
  
  // Custom plugin to fix cursor position after tag application
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tagMarkCursorFix'),
        
        // This plugin prevents the tag mark from affecting cursor position during key operations
        props: {
          // Process key events to prevent cursor jumping
          handleKeyDown(view, event) {
            // Skip Delete key which is handled by TagCursorFix extension
            if (event.key === 'Delete') {
              return false;
            }
            
            // Handle only Enter and Backspace
            if (event.key === 'Enter' || event.key === 'Backspace') {
              // Store the current cursor position before any key event
              const currentPos = view.state.selection.from;
              
              // Set a meta flag that this transaction is from a key operation that needs cursor protection
              const tr = view.state.tr;
              tr.setMeta('cursorProtection', { 
                key: event.key,
                position: currentPos 
              });
              view.dispatch(tr);
              
              // Don't prevent the default handling
              return false;
            }
            return false;
          }
        },
        
        // Process transactions to prevent cursor jumping
        appendTransaction(transactions, oldState, newState) {
          // Only process transactions with cursor protection flag
          if (!transactions.some(tr => tr.getMeta('cursorProtection'))) {
            return null;
          }
          
          // Get key information from transaction meta
          const keyInfo = transactions.find(tr => tr.getMeta('cursorProtection'))?.getMeta('cursorProtection');
          const lastKey = keyInfo?.key || null;
          
          // Skip Delete key which is now handled by TagCursorFix
          if (lastKey === 'Delete') {
            return null;
          }
          
          // Regular cursor jump detection
          const oldPos = oldState.selection.from;
          const newPos = newState.selection.from;
          const docSize = newState.doc.content.size;
          const cursorJumped = newPos >= docSize - 5 && Math.abs(newPos - oldPos) > 20;
          
          // Determine if we need to handle this transaction
          const needsHandling = cursorJumped || lastKey === 'Backspace';
          
          if (needsHandling) {
            // Create a transaction to fix the cursor position
            const tr = newState.tr;
            tr.setMeta('cursorPositionFixed', true);
            
            // Calculate better position - either old position or adjusted for document changes
            let targetPos = oldPos;
            
            // Adjust for specific keys
            if (lastKey === 'Enter') {
              // If we were at the end of a line, position at start of new line
              const wasAtLineEnd = oldState.selection.$from.pos === oldState.selection.$from.end();
              if (wasAtLineEnd) {
                targetPos += 1;
              }
            } else if (lastKey === 'Backspace') {
              // For Backspace, adjust position backwards
              if (oldPos > 0) {
                targetPos = Math.max(0, oldPos - 1);
              }
            }
            
            // Ensure the position is valid
            targetPos = Math.min(targetPos, docSize - 1);
            targetPos = Math.max(0, targetPos);
            
            // Set the selection to the calculated position
            tr.setSelection(TextSelection.create(newState.doc, targetPos));
            console.log('TagMark fixing cursor for', lastKey, 'from', oldPos, 'to', targetPos);
            
            return tr;
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
        parseHTML: element => element.getAttribute('data-range-id'),
        renderHTML: attributes => {
          if (!attributes.id) return {};
          return { 'data-range-id': attributes.id };
        },
      },
      tagId: {
        default: null,
        parseHTML: element => element.getAttribute('data-tag-id'),
        renderHTML: attributes => {
          if (!attributes.tagId) return {};
          return { 'data-tag-id': attributes.tagId };
        },
      },
      color: {
        default: '#3366FF',
        parseHTML: element => {
          // Extract color from style attribute
          const style = element.getAttribute('style') || '';
          const match = style.match(/border-bottom-color: ([^;]+);/);
          return match ? match[1] : '#3366FF';
        },
        renderHTML: attributes => {
          return {}; // Color is handled in the style attribute
        },
      },
      name: {
        default: '',
        parseHTML: element => element.getAttribute('data-tag-name'),
        renderHTML: attributes => {
          if (!attributes.name) return {};
          return { 'data-tag-name': attributes.name };
        },
      },
      description: {
        default: '',
        parseHTML: element => element.getAttribute('title'),
        renderHTML: attributes => {
          if (!attributes.description) return {};
          return { 'title': attributes.description };
        },
      },
      // Content tracking attributes
      content: {
        default: '',
        parseHTML: element => element.getAttribute('data-content'),
        renderHTML: attributes => {
          if (!attributes.content) return {};
          return { 'data-content': attributes.content };
        },
      },
      contentBefore: {
        default: '',
        parseHTML: element => element.getAttribute('data-content-before'),
        renderHTML: attributes => {
          if (!attributes.contentBefore) return {};
          return { 'data-content-before': attributes.contentBefore };
        },
      },
      contentAfter: {
        default: '',
        parseHTML: element => element.getAttribute('data-content-after'),
        renderHTML: attributes => {
          if (!attributes.contentAfter) return {};
          return { 'data-content-after': attributes.contentAfter };
        },
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
      // Also parse <mark> tags with data-type=tag
      {
        tag: 'mark[data-type="tag"]',
      },
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
    
    // Create the inline UI with remove button using data attribute
    // We'll use JavaScript to convert this data attribute into actual DOM elements
    const inlineUiData = JSON.stringify({
      id: tagId,
      name: tagName,
      color: color,
      rangeId: rangeId
    });
    
    return [
      'mark',
      mergeAttributes(
        { 'data-tag': '' },
        { 'data-type': 'tag' },
        { 
          'class': 'tagged-text',
          'data-tag-name': HTMLAttributes.name,
          'title': HTMLAttributes.description || HTMLAttributes.name,
          'style': inlineStyle,
          'data-last-updated': updatedTimestamp,
          'data-tag-id': HTMLAttributes.tagId,
          'data-range-id': HTMLAttributes.id,
          'data-inline-ui': inlineUiData,
        },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      0,
    ]
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