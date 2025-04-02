import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';

/**
 * TagCursorFix Extension
 * 
 * This extension specifically addresses the cursor jumping issue when using Enter or Delete
 * keys in documents containing tags.
 * 
 * The issue occurs when a line containing a tag or adjacent to a tag is moved via Enter or Delete,
 * causing the cursor to incorrectly jump to the end of the document.
 */
export const TagCursorFix = Extension.create({
  name: 'tagCursorFix',
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tagCursorFix'),
        
        // Track cursor position and key presses
        state: {
          init() {
            return { 
              lastPos: null,
              lastKey: null,
              isKeyHandling: false
            };
          },
          
          apply(tr, value, oldState, newState) {
            // Skip our own fix transactions
            if (tr.getMeta('tagCursorFixed')) {
              return { ...value, isKeyHandling: false };
            }
            
            // Store current key if this is a key event
            if (tr.getMeta('tagKeyEvent')) {
              return {
                ...value,
                lastKey: tr.getMeta('tagKeyEvent').key,
                lastPos: oldState.selection.from,
                isKeyHandling: true
              };
            }
            
            // If tracking a key event and doc changed, keep the last position
            if (value.isKeyHandling && tr.docChanged) {
              return {
                ...value,
                isKeyHandling: true
              };
            }
            
            // Reset tracking for normal transactions
            if (!value.isKeyHandling) {
              return {
                lastPos: newState.selection.from,
                lastKey: null,
                isKeyHandling: false
              };
            }
            
            // Keep tracking during key handling
            return value;
          }
        },
        
        // Handle key events that might cause cursor jumping
        props: {
          handleKeyDown(view, event) {
            if (event.key === 'Enter' || event.key === 'Delete' || event.key === 'Backspace') {
              // Store current cursor position before any key handling
              const currentPos = view.state.selection.from;
              
              // Special handling for Delete key - most direct approach
              if (event.key === 'Delete') {
                // Get current selection
                const { state } = view;
                const { selection, doc } = state;
                const { from, to, empty } = selection;
                
                // Only handle when cursor is at a single position (not a selection range)
                if (empty) {
                  // Prevent default Delete key behavior
                  event.preventDefault();
                  
                  // Handle the delete manually with explicit cursor control
                  const tr = state.tr;
                  
                  // Check if we're at the end of document
                  if (from < doc.content.size) {
                    // Get current position info
                    const $pos = selection.$head;
                    const isEndOfLine = $pos.pos === $pos.end();
                    
                    if (isEndOfLine && from + 1 < doc.content.size) {
                      // We're at the end of a line/paragraph, need to join with next node
                      // This is equivalent to deleting the newline
                      
                      // Find the node we're in and the next node
                      const currentNode = $pos.node();
                      const nextPos = $pos.after();
                      const $nextPos = doc.resolve(nextPos);
                      
                      if ($nextPos.node()) {
                        // Delete the content between current position and start of next node content
                        // This effectively joins the nodes
                        tr.delete(from, nextPos + 1);
                        
                        // Keep cursor at the same position
                        tr.setSelection(TextSelection.create(tr.doc, from));
                      } else {
                        // Simple delete if next node isn't available
                        tr.delete(from, from + 1);
                        tr.setSelection(TextSelection.create(tr.doc, from));
                      }
                    } else {
                      // Normal delete within a line/node
                      tr.delete(from, from + 1);
                      tr.setSelection(TextSelection.create(tr.doc, from));
                    }
                    
                    // Dispatch with meta to prevent further handling
                    tr.setMeta('tagCursorFixed', true);
                    view.dispatch(tr);
                    
                    console.log('Manual Delete key handling at position:', from);
                    
                    // Return true to indicate we handled this event
                    return true;
                  }
                }
              }
              
              // For other keys, just track the position for potential fixes
              const tr = view.state.tr;
              tr.setMeta('tagKeyEvent', { 
                key: event.key,
                position: currentPos 
              });
              view.dispatch(tr);
              
              // Continue with normal handling for non-Delete keys
              return false;
            }
            return false;
          }
        },
        
        // Fix cursor position when it jumps during tag operations
        appendTransaction(transactions, oldState, newState) {
          // Get our state
          const pluginState = this.getState(newState);
          if (!pluginState || !pluginState.lastPos) {
            return null;
          }
          
          // Check for document changes
          const docChanged = transactions.some(tr => tr.docChanged);
          if (!docChanged) {
            return null;
          }
          
          // Get positions
          const oldPos = pluginState.lastPos;
          const newPos = newState.selection.from;
          const docSize = newState.doc.content.size;
          
          // Get key info from transaction metadata if available
          const keyInfo = transactions.find(tr => tr.getMeta('tagKeyEvent'))?.getMeta('tagKeyEvent');
          const isDeleteOperation = keyInfo?.key === 'Delete';
          
          // Always handle Delete key specifically
          if (isDeleteOperation) {
            // Create a fix transaction for Delete key
            const tr = newState.tr;
            tr.setMeta('tagCursorFixed', true);
            
            // Use the exact position from before the delete key was pressed
            const targetPos = keyInfo.position || oldPos;
            
            // Make sure position is valid in the current document
            const safePos = Math.min(targetPos, newState.doc.content.size - 1);
            const validPos = Math.max(0, safePos);
            
            // Set cursor position
            tr.setSelection(TextSelection.create(newState.doc, validPos));
            console.log('DELETE KEY FIX: Setting cursor position to:', validPos);
            
            return tr;
          }
          
          // Regular cursor jump detection
          const cursorJumped = (newPos >= docSize - 5) || (Math.abs(newPos - oldPos) > 100);
          
          // Debug info
          console.log('TagCursorFix check:', { 
            oldPos, 
            newPos, 
            docSize,
            key: pluginState.lastKey,
            jumped: cursorJumped
          });
          
          if (cursorJumped) {
            // Create a fix transaction
            const tr = newState.tr;
            tr.setMeta('tagCursorFixed', true);
            
            // Calculate target position
            let targetPos = oldPos;
            
            // Special handling for different keys
            if (pluginState.lastKey === 'Enter') {
              // Get information about the old selection position
              const $from = oldState.selection.$from;
              const wasAtEndOfLine = $from.pos === $from.end();
              
              if (wasAtEndOfLine) {
                // Move one character forward to position at start of new line
                targetPos += 1;
              }
            } else if (pluginState.lastKey === 'Backspace') {
              // For Backspace, move cursor back by 1 (unless at start of doc)
              if (oldPos > 0) {
                targetPos = Math.max(0, oldPos - 1);
              }
            }
            
            // Ensure position is valid
            targetPos = Math.min(targetPos, docSize - 1);
            targetPos = Math.max(0, targetPos);
            
            // Set cursor position
            tr.setSelection(TextSelection.create(newState.doc, targetPos));
            console.log('Fixing cursor position to:', targetPos, 'for key:', pluginState.lastKey);
            
            return tr;
          }
          
          return null;
        }
      })
    ];
  }
}); 