import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { v4 as uuidv4 } from 'uuid';
import { TagMark } from './tag-mark';
import { Tag, TaggingOptions } from './tag-types';

export const TaggingExtensionKey = 'tagging';

// Create a dedicated plugin key for tracking tag changes
export const TagTrackingPluginKey = new PluginKey('tagTracking');

export const TaggingExtension = Extension.create<TaggingOptions>({
  name: 'tagging',

  addOptions() {
    return {
      onTagApplied: () => {},
      onTagRemoved: () => {},
      onDocumentTagsUpdated: () => {},
      defaultTags: [],
    };
  },

  addStorage() {
    // Capture reference to the extension instance and editor
    const extension = this;
    
    return {
      tags: this.options.defaultTags?.reduce(
        (acc, tag) => ({ ...acc, [tag.id]: tag }),
        {} as Record<string, Tag>
      ) || {},
      documentTags: [] as Tag[],
      // Add storage for tag metadata to help with tag recovery
      tagMetadata: {} as Record<string, any>,
      
      // Add methods to storage so they're accessible in plugin contexts
      updateTagVisibility: (force = false) => {
        // Use captured extension reference instead of 'this'
        if (!extension.editor) return;
        
        const { state, view } = extension.editor;
        
        // If the extension hasn't been fully initialized, don't proceed
        if (!view || !state) return;

        try {
          // Use a transaction to handle updates
          const tr = state.tr;
          let transactionModified = false;
          
          // Force tag marks to be preserved by marking the transaction
          tr.setMeta('preserveTagMarks', true);
          
          // Apply each tag from the metadata to ensure visibility
          const tagMetadata = extension.storage.tagMetadata || {};
          
          if (Object.keys(tagMetadata).length > 0) {
            // Gather all tag positions and compare to what's in the document
            const documentTags = new Map();
            
            // First collect what's actually in the document
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.marks.length) return true;
              
              const tagMarks = node.marks.filter(mark => mark.type.name === 'tag');
              
              for (const mark of tagMarks) {
                const rangeId = mark.attrs.id;
                if (rangeId) {
                  documentTags.set(rangeId, {
                    mark,
                    pos,
                    nodeSize: node.nodeSize
                  });
                }
              }
              
              return true;
            });
            
            // Now apply or restore missing tags from metadata
            for (const [rangeId, metadata] of Object.entries(tagMetadata)) {
              // Skip if already properly displayed in document
              if (documentTags.has(rangeId) && !force) continue;
              
              try {
                // Get the tag definition
                const tagId = metadata.tagId;
                const tag = extension.storage.tags[tagId];
                
                if (!tag) continue; // Skip if tag not found
                
                // Attempt to find the text based on content
                if (metadata.content && metadata.content.trim().length > 0) {
                  let textFound = false;
                  
                  state.doc.descendants((node, pos) => {
                    if (textFound || !node.isText) return true;
                    
                    const text = node.text || '';
                    if (text.includes(metadata.content)) {
                      const index = text.indexOf(metadata.content);
                      const from = pos + index;
                      const to = from + metadata.content.length;
                      
                      // Validate position bounds
                      if (from >= 0 && to <= state.doc.content.size && from < to) {
                        // Create and apply the mark
                        const mark = state.schema.marks.tag.create({
                          id: rangeId,
                          tagId: tagId,
                          color: tag.color,
                          name: tag.name,
                          description: tag.description,
                          content: metadata.content,
                          contentBefore: metadata.contentBefore,
                          contentAfter: metadata.contentAfter,
                          lastUpdated: new Date().toISOString()
                        });
                        
                        tr.addMark(from, to, mark);
                        transactionModified = true;
                        textFound = true;
                        
                        // Update metadata position
                        metadata.position = { from, to };
                        
                        console.log(`Restored tag ${rangeId} for content "${metadata.content}" at ${from}-${to}`);
                        return false; // Stop iteration once found
                      }
                    }
                    
                    return true;
                  });
                } 
                // If content-based search failed, try position-based as fallback
                else if (metadata.position) {
                  const { from, to } = metadata.position;
                  
                  // Validate position
                  if (from >= 0 && to <= state.doc.content.size && from < to) {
                    // Get the current text at this position
                    const currentText = state.doc.textBetween(from, to);
                    
                    if (currentText && currentText.trim().length > 0) {
                      // Create and apply the mark
                      const mark = state.schema.marks.tag.create({
                        id: rangeId,
                        tagId: tagId,
                        color: tag.color,
                        name: tag.name,
                        description: tag.description,
                        content: currentText, // Use current text
                        contentBefore: metadata.contentBefore,
                        contentAfter: metadata.contentAfter,
                        lastUpdated: new Date().toISOString()
                      });
                      
                      tr.addMark(from, to, mark);
                      transactionModified = true;
                      
                      // Update metadata content
                      metadata.content = currentText;
                      
                      console.log(`Restored tag ${rangeId} using position at ${from}-${to}`);
                    }
                  }
                }
              } catch (error) {
                console.error(`Error restoring tag ${rangeId}:`, error);
              }
            }
          }
          
          // Only dispatch if we made changes
          if (transactionModified) {
            view.dispatch(tr);
          }
        } catch (error) {
          console.error('Error updating tag visibility:', error);
        }
      }
    };
  },
  
  // Add the TagMark as an extension
  addExtensions() {
    return [
      TagMark,
    ]
  },

  // Add plugins for tracking tag positions and document changes
  addProseMirrorPlugins() {
    const { view, state } = this.editor;
    const extension = this; // Store reference to the extension for plugin access
    
    const plugins = [
      new Plugin({
        key: TagTrackingPluginKey,
        // Track mapping between old and new document states
        appendMapping(mapping) {
          // This method is called when document structure changes
          const { editor } = this;
          if (!editor) return;

          // Get the current tagging extension storage
          const storage = editor.storage.tagging;
          if (!storage || !storage.tagMetadata) return;

          try {
            // For each tag, update its position based on mapping
            Object.values(storage.tagMetadata).forEach((meta: any) => {
              if (meta && meta.position) {
                const oldFrom = meta.position.from;
                const oldTo = meta.position.to;
                
                // Apply mapping to get new positions
                const newFrom = mapping.map(oldFrom);
                const newTo = mapping.map(oldTo);
                
                // Update position in storage if it changed
                if (newFrom !== oldFrom || newTo !== oldTo) {
                  meta.position = { from: newFrom, to: newTo };
                  
                  // Update content to match new position
                  try {
                    const doc = editor.state.doc;
                    if (newFrom >= 0 && newTo <= doc.content.size && newFrom < newTo) {
                      meta.content = doc.textBetween(newFrom, newTo);
                      
                      // Update context for better recovery
                      const contextSize = 30;
                      const beforeStart = Math.max(0, newFrom - contextSize);
                      const afterEnd = Math.min(doc.content.size, newTo + contextSize);
                      
                      meta.contentBefore = doc.textBetween(beforeStart, newFrom);
                      meta.contentAfter = doc.textBetween(newTo, afterEnd);
                    }
                  } catch (e) {
                    console.error('Error updating tag content after mapping:', e);
                  }
                }
              }
            });

            // After updating tag positions, also look for tag marks that need visual updating
            this.updateView();
          } catch (error) {
            console.error('Error in tag position mapping:', error);
          }
        },
        
        // Track transactions for tag position updates
        appendTransaction(transactions, oldState, newState) {
          // Don't process if no transactions changed the doc
          if (!transactions.some(tr => tr.docChanged)) return null;
          
          const { editor } = this;
          if (!editor) return null;
          
          const tr = newState.tr;
          let changed = false;
          
          try {
            // Get current tag metadata
            const storage = editor.storage.tagging;
            if (!storage || !storage.tagMetadata) return null;
            
            // Check tag marks in the new document and update as needed
            newState.doc.descendants((node, pos) => {
              if (!node.isText || !node.marks.length) return true;
              
              // Find tag marks on this node
              const tagMarks = node.marks.filter(mark => mark.type.name === 'tag');
              
              for (const mark of tagMarks) {
                const rangeId = mark.attrs.id;
                if (!rangeId) continue;
                
                // If we have this tag in metadata, check if we need to update its visual appearance
                const metadata = storage.tagMetadata[rangeId];
                if (metadata) {
                  // Calculate the end position
                  const endPos = pos + node.nodeSize;
                  
                  // Update metadata with the current position
                  metadata.position = { from: pos, to: endPos };
                  
                  // Update content data
                  metadata.content = node.text;
                  
                  // If tag appears to have wrong attributes (maybe from paste/duplicate),
                  // update the mark with correct data
                  if (mark.attrs.content !== metadata.content ||
                      !mark.attrs.color || !mark.attrs.name) {
                    
                    const tagId = metadata.tagId;
                    const tag = storage.tags[tagId];
                    
                    if (tag) {
                      tr.removeMark(pos, endPos, mark.type);
                      tr.addMark(pos, endPos, mark.type.create({
                        id: rangeId,
                        tagId: tagId,
                        color: tag.color,
                        name: tag.name,
                        description: tag.description,
                        content: metadata.content,
                        contentBefore: metadata.contentBefore,
                        contentAfter: metadata.contentAfter
                      }));
                      changed = true;
                    }
                  }
                }
              }
              
              return true;
            });
            
            // Return transaction if we made changes
            return changed ? tr : null;
          } catch (error) {
            console.error('Error updating tag marks:', error);
            return null;
          }
        }
      }),
      
      // Add a new plugin for persistent tag recovery
      new Plugin({
        key: new PluginKey('tagging-persistence'),
        
        // Run when the editor view is created
        view: () => {
          return {
            update: (view, oldState) => {
              // Check if this is the initial render or if doc changed
              const docChanged = !oldState || !view.state.doc.eq(oldState.doc);
              
              if (docChanged) {
                // Schedule tag visibility update after a delay to ensure editor is stable
                setTimeout(() => {
                  if (extension.editor && !extension.editor.isDestroyed) {
                    // Force update tag visibility using the storage method
                    extension.storage.updateTagVisibility(true);
                  }
                }, 500);
              }
            },
            
            // Set up periodic persistence check
            destroy: () => {
              // Cleanup logic if needed
            }
          };
        },
        
        // Override appendTransaction to ensure tag marks are preserved during doc changes
        appendTransaction: (transactions, oldState, newState) => {
          // Early return if nothing changed related to tags
          if (!transactions.some(tr => tr.docChanged) && !transactions.some(tr => tr.getMeta('preserveTagMarks')) && !transactions.some(tr => tr.getMeta(TaggingExtensionKey))) {
            return null;
          }

          // Create a new transaction to apply any tag-related changes
          const newTr = newState.tr;
          let hasChanges = false;
          
          // Always mark the transaction to preserve tag marks
          newTr.setMeta('preserveTagMarks', true);
          // Add a higher priority flag to ensure tags are preserved
          newTr.setMeta('forcePreserveTagMarks', true);

          // First, always preserve the TaggingExtensionKey meta from the original transaction
          const tagsMeta = transactions.find(tr => tr.getMeta(TaggingExtensionKey))?.getMeta(TaggingExtensionKey);
          if (tagsMeta) {
            newTr.setMeta(TaggingExtensionKey, tagsMeta);
            hasChanges = true;
          } else {
            // If no meta in the transaction, use our current storage
            newTr.setMeta(TaggingExtensionKey, extension.storage);
          }
          
          // If the document changed, we need to update tag positions
          if (transactions.some(tr => tr.docChanged)) {
            try {
              // Update tag positions based on the mapping
              const mapping = transactions.find(tr => tr.docChanged)?.mapping;
              
              // If tag metadata exists, update positions
              if (extension.storage.tagMetadata) {
                const updatedMetadata = { ...extension.storage.tagMetadata };
                
                // Track which tags were updated and need visual restoration
                const tagsToRestore = new Map();
                
                // Update positions of all tags in metadata
                for (const [id, metadata] of Object.entries(updatedMetadata)) {
                  if (metadata.position) {
                    const { from, to } = metadata.position;
                    
                    // Map the positions to the new document
                    const newFrom = mapping?.map(from);
                    const newTo = mapping?.map(to);
                    
                    // Only update if the position is still valid
                    if (newFrom >= 0 && newTo <= newState.doc.content.size && newFrom < newTo) {
                      // Update the position in metadata
                      metadata.position = { from: newFrom, to: newTo };
                      
                      // Update content if possible
                      try {
                        const content = newState.doc.textBetween(newFrom, newTo);
                        if (content && content.trim().length > 0) {
                          metadata.content = content;
                          
                          // Mark this tag for potential restoration
                          tagsToRestore.set(id, {
                            metadata,
                            from: newFrom,
                            to: newTo
                          });
                        }
                      } catch (contentError) {
                        console.warn(`Error updating content for tag ${id}:`, contentError);
                      }
                    }
                  }
                }
                
                // Update the storage with the new positions
                extension.storage.tagMetadata = updatedMetadata;
                
                // Always set the metadata on the transaction
                newTr.setMeta(TaggingExtensionKey, extension.storage);
                hasChanges = true;
                
                // Check for missing tags in the document and restore them
                if (tagsToRestore.size > 0) {
                  // First, check which tags are already visible in the document
                  const visibleTags = new Set();
                  
                  newState.doc.descendants((node, pos) => {
                    if (!node.isText || !node.marks.length) return true;
                    
                    const tagMarks = node.marks.filter(mark => mark.type.name === 'tag');
                    for (const mark of tagMarks) {
                      if (mark.attrs.id) {
                        visibleTags.add(mark.attrs.id);
                      }
                    }
                    
                    return true;
                  });
                  
                  // Now restore any tags that are in metadata but not visible
                  for (const [id, data] of tagsToRestore.entries()) {
                    if (!visibleTags.has(id)) {
                      const { metadata, from, to } = data;
                      const tagId = metadata.tagId;
                      
                      // Skip if tag definition is missing
                      const tag = extension.storage.tags[tagId];
                      if (!tag) continue;
                      
                      try {
                        // Create the mark
                        const mark = newState.schema.marks.tag.create({
                          id: id,
                          tagId: tagId,
                          color: tag.color,
                          name: tag.name,
                          description: tag.description,
                          content: metadata.content,
                          contentBefore: metadata.contentBefore,
                          contentAfter: metadata.contentAfter,
                          lastUpdated: new Date().toISOString()
                        });
                        
                        // Add the mark to the transaction
                        newTr.addMark(from, to, mark);
                        hasChanges = true;
                        
                        console.log(`Restored missing tag ${id} at position ${from}-${to}`);
                      } catch (error) {
                        console.error(`Error restoring tag ${id}:`, error);
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error in appendTransaction for tags:', error);
            }
          }
          
          // Return the transaction if it has changes
          return hasChanges ? newTr : null;
        }
      }),
      
      // Add a dedicated tag persistence plugin with higher priority
      new Plugin({
        key: new PluginKey('tag-always-visible'),
        priority: 200, // Higher priority than default plugins
        
        // Add a specialized filter method to explicitly prevent removal of tag marks
        filterTransaction: (tr, state) => {
          // Skip our own transactions with the preserve tag
          if (tr.getMeta('preserveTagMarks') || tr.getMeta('forcePreserveTagMarks')) {
            return true;
          }
          
          // Don't interfere with editor initialization
          if (!state.doc.content.size) {
            return true;
          }
          
          // Check if the transaction is removing any tag marks
          let isRemovingTagMarks = false;
          
          tr.steps.forEach((step, i) => {
            // Check for RemoveMarkStep that affects tag marks
            if (step.jsonID === 'removeMark' && 
                step.mark && 
                step.mark.type && 
                step.mark.type.name === 'tag') {
              isRemovingTagMarks = true;
            }
          });
          
          // If the transaction is removing tags unexpectedly, block it
          // Only allow explicit tag removal through our commands
          if (isRemovingTagMarks && !tr.getMeta('allowTagRemoval')) {
            console.log('Prevented transaction that would remove tag marks');
            return false;
          }
          
          return true;
        },
        
        // Check for missing tags on every state update
        appendTransaction: (transactions, oldState, newState) => {
          // Skip if we've already processed this in another plugin
          if (transactions.some(tr => tr.getMeta('preserveTagMarks'))) {
            return null;
          }
          
          // If any tags exist in metadata but aren't visible, try to restore them
          if (!extension.storage.tagMetadata || 
              Object.keys(extension.storage.tagMetadata).length === 0) {
            return null;
          }
          
          // Run more frequently to ensure tags stay visible (60% chance)
          const shouldCheckForLostTags = Math.random() < 0.6; 
          if (!shouldCheckForLostTags && !transactions.some(tr => tr.docChanged)) {
            return null;
          }
          
          try {
            // Create a transaction for restoring tags
            const tr = newState.tr;
            tr.setMeta('preserveTagMarks', true);
            let hasChanges = false;
            
            // Find all visible tags in the document
            const visibleTags = new Set();
            newState.doc.descendants((node, pos) => {
              if (!node.isText || !node.marks.length) return true;
              
              const tagMarks = node.marks.filter(mark => mark.type.name === 'tag');
              for (const mark of tagMarks) {
                if (mark.attrs.id) {
                  visibleTags.add(mark.attrs.id);
                }
              }
              
              return true;
            });
            
            // Check for tags in metadata that are missing from the document
            for (const [id, metadata] of Object.entries(extension.storage.tagMetadata)) {
              // Skip if already visible
              if (visibleTags.has(id)) continue;
              
              // Try to restore based on content
              if (metadata.content && metadata.content.trim().length > 0) {
                let found = false;
                
                newState.doc.descendants((node, pos) => {
                  if (found || !node.isText) return true;
                  
                  const text = node.text || '';
                  if (text.includes(metadata.content)) {
                    const index = text.indexOf(metadata.content);
                    const from = pos + index;
                    const to = from + metadata.content.length;
                    
                    // Validate position bounds
                    if (from >= 0 && to <= newState.doc.content.size && from < to) {
                      // Get tag definition
                      const tagId = metadata.tagId;
                      const tag = extension.storage.tags[tagId];
                      if (!tag) return true;
                      
                      // Create and apply the mark
                      const mark = newState.schema.marks.tag.create({
                        id: id,
                        tagId: tagId,
                        color: tag.color,
                        name: tag.name,
                        description: tag.description,
                        content: metadata.content,
                        contentBefore: metadata.contentBefore,
                        contentAfter: metadata.contentAfter,
                        lastUpdated: new Date().toISOString()
                      });
                      
                      tr.addMark(from, to, mark);
                      hasChanges = true;
                      found = true;
                      
                      // Update position in metadata
                      metadata.position = { from, to };
                      
                      return false; // Stop once found
                    }
                  }
                  
                  return true;
                });
              }
            }
            
            return hasChanges ? tr : null;
          } catch (error) {
            console.error('Error in tag persistence check:', error);
            return null;
          }
        }
      })
    ];
    
    return plugins;
  },

  addCommands() {
    return {
      addTag: (tag: Tag, start: number, end: number) => ({ chain, state }) => {
        // Trim spaces from selection
        const text = state.doc.textBetween(start, end);
        let trimmedStart = start;
        let trimmedEnd = end;
        
        // Count leading spaces
        for (let i = 0; i < text.length; i++) {
          if (text[i] === ' ' || text[i] === '\t' || text[i] === '\n') {
            trimmedStart++;
          } else {
            break;
          }
        }
        
        // Count trailing spaces
        for (let i = text.length - 1; i >= 0; i--) {
          if (text[i] === ' ' || text[i] === '\t' || text[i] === '\n') {
            trimmedEnd--;
          } else {
            break;
          }
        }
        
        // Ensure valid range
        if (trimmedStart >= trimmedEnd) {
          return false;
        }
        
        // Generate a unique ID for this tag instance
        const rangeId = uuidv4();
        
        // Store the tag if it doesn't exist
        if (!this.storage.tags[tag.id]) {
          this.storage.tags[tag.id] = { ...tag, isDocumentTag: false };
        }
        
        // Capture context for tag recovery
        const contextSize = 30;
        const beforeStart = Math.max(0, trimmedStart - contextSize);
        const afterEnd = Math.min(state.doc.content.size, trimmedEnd + contextSize);
        
        const contentBefore = state.doc.textBetween(beforeStart, trimmedStart);
        const taggedContent = state.doc.textBetween(trimmedStart, trimmedEnd);
        const contentAfter = state.doc.textBetween(trimmedEnd, afterEnd);
        
        // Store metadata for recovery
        this.storage.tagMetadata[rangeId] = {
          id: rangeId,
          tagId: tag.id,
          position: { from: trimmedStart, to: trimmedEnd },
          content: taggedContent,
          contentBefore,
          contentAfter,
          created: new Date().toISOString()
        };
        
        // Call the onTagApplied callback if provided
        if (this.options.onTagApplied) {
          this.options.onTagApplied(
            this.storage.tags[tag.id], 
            { id: rangeId, start: trimmedStart, end: trimmedEnd, tagId: tag.id }
          );
        }
        
        // Apply the tag mark to the text with content information
        return chain()
          .focus()
          .setTextSelection({ from: trimmedStart, to: trimmedEnd })
          .setMark('tag', {
            id: rangeId,
            tagId: tag.id,
            color: tag.color,
            name: tag.name,
            description: tag.description,
            content: taggedContent,
            contentBefore,
            contentAfter
          })
          .run();
      },

      // Add a document-level tag (which doesn't have a range)
      addDocumentTag: (tag: Tag) => ({ commands }) => {
        // Mark this as a document tag
        const documentTag = {
          ...tag,
          isDocumentTag: true,
        };
        
        // Update the storage with the document tag
        this.storage.tags[tag.id] = documentTag;
        
        // Update document tags list
        this.storage.documentTags = [
          ...this.storage.documentTags.filter(t => t.id !== tag.id),
          documentTag
        ];
        
        // Call the document tags updated callback if provided
        if (this.options.onDocumentTagsUpdated) {
          this.options.onDocumentTagsUpdated(this.storage.documentTags);
        }
        
        return true;
      },
      
      // Remove a document-level tag
      removeDocumentTag: (tagId: string) => ({ commands }) => {
        // Check if the tag exists and is a document tag
        const tag = this.storage.tags[tagId];
        if (!tag || !tag.isDocumentTag) return false;
        
        // Create a new tags object without this tag
        const newTags = { ...this.storage.tags };
        delete newTags[tagId];
        this.storage.tags = newTags;
        
        // Update document tags list
        this.storage.documentTags = this.storage.documentTags.filter(t => t.id !== tagId);
        
        // Call the document tags updated callback if provided
        if (this.options.onDocumentTagsUpdated) {
          this.options.onDocumentTagsUpdated(this.storage.documentTags);
        }
        
        return true;
      },
      
      // Get all document tags
      getDocumentTags: () => () => {
        return this.storage.documentTags;
      },
      
      // Find and navigate to a tag by rangeId, with content-based recovery
      findAndNavigateToTag: (rangeId: string) => ({ editor, state, tr }) => {
        try {
          // First try direct ID matching (most efficient)
          let found = false;
          let position = null;
          
          // Method 1: Find by mark ID
          state.doc.descendants((node, pos) => {
            if (found) return false;
            
            if (node.isText && node.marks.length) {
              const tagMark = node.marks.find(mark => 
                mark.type.name === 'tag' && mark.attrs.id === rangeId
              );
              
              if (tagMark) {
                found = true;
                position = { from: pos, to: pos + node.nodeSize };
                return false;
              }
            }
            
            return true;
          });
          
          // Method 2: If direct ID match failed, try content matching
          if (!found && this.storage.tagMetadata[rangeId]) {
            const metadata = this.storage.tagMetadata[rangeId];
            const taggedContent = metadata.content;
            
            if (taggedContent && taggedContent.length > 0) {
              console.log('Attempting content-based recovery for tag', rangeId);
              
              // Search for the tagged content in the document
              state.doc.descendants((node, pos) => {
                if (found || !node.isText) return true;
                
                const text = node.text || '';
                const index = text.indexOf(taggedContent);
                
                if (index !== -1) {
                  // Potential match, check surrounding context for better accuracy
                  let isMatch = true;
                  
                  // Check text before for context match
                  if (metadata.contentBefore && pos - metadata.contentBefore.length >= 0) {
                    const textBefore = state.doc.textBetween(
                      Math.max(0, pos - metadata.contentBefore.length),
                      pos
                    );
                    
                    // Fuzzy match - look for substantial overlap
                    const overlap = Math.min(textBefore.length, metadata.contentBefore.length);
                    const similarity = textBefore.slice(-overlap) === metadata.contentBefore.slice(-overlap);
                    
                    if (!similarity) {
                      isMatch = false;
                    }
                  }
                  
                  // Check text after for context match
                  if (isMatch && metadata.contentAfter) {
                    const nodeEnd = pos + node.nodeSize;
                    const textAfter = state.doc.textBetween(
                      nodeEnd,
                      Math.min(state.doc.content.size, nodeEnd + metadata.contentAfter.length)
                    );
                    
                    // Fuzzy match - look for substantial overlap
                    const overlap = Math.min(textAfter.length, metadata.contentAfter.length);
                    const similarity = textAfter.slice(0, overlap) === metadata.contentAfter.slice(0, overlap);
                    
                    if (!similarity) {
                      isMatch = false;
                    }
                  }
                  
                  if (isMatch) {
                    found = true;
                    const from = pos + index;
                    const to = from + taggedContent.length;
                    
                    // Validate the positions are within document bounds
                    if (from >= 0 && to <= state.doc.content.size) {
                      position = { from, to };
                      
                      // Update the stored position
                      this.storage.tagMetadata[rangeId].position = { from, to };
                    }
                    return false;
                  }
                }
                
                return true;
              });
            }
          }
          
          // Try a more aggressive fuzzy search if still not found
          if (!found && this.storage.tagMetadata[rangeId]) {
            console.log('Attempting fuzzy search for tag', rangeId);
            
            const metadata = this.storage.tagMetadata[rangeId];
            const taggedContent = metadata.content;
            
            if (taggedContent && taggedContent.length > 5) {
              // For longer content, try matching portions
              const minMatchLength = Math.min(5, taggedContent.length - 1);
              const searchPattern = taggedContent.slice(0, minMatchLength);
              
              // Search document for any text that starts with our pattern
              state.doc.descendants((node, pos) => {
                if (found || !node.isText) return true;
                
                const text = node.text || '';
                for (let i = 0; i <= text.length - minMatchLength; i++) {
                  const chunk = text.slice(i, i + minMatchLength);
                  
                  if (chunk === searchPattern) {
                    // Found start of potential match, check if the full text matches
                    const potentialMatch = text.slice(i, i + taggedContent.length);
                    
                    // Calculate similarity between potential match and original content
                    const similarity = calculateSimilarity(potentialMatch, taggedContent);
                    
                    if (similarity > 0.7) { // Good enough match
                      found = true;
                      const from = pos + i;
                      const to = from + potentialMatch.length;
                      
                      // Validate positions
                      if (from >= 0 && to <= state.doc.content.size) {
                        position = { from, to };
                        
                        // Update metadata with new position and content
                        this.storage.tagMetadata[rangeId].position = { from, to };
                        this.storage.tagMetadata[rangeId].content = potentialMatch;
                        
                        return false;
                      }
                    }
                  }
                }
                
                return true;
              });
            }
          }
          
          // If we found the tag, navigate to it and apply the mark
          if (found && position) {
            try {
              // Validate that these positions are still valid in the current document
              if (position.from < 0 || position.to > state.doc.content.size || position.from >= position.to) {
                console.warn('Invalid tag position:', position);
                return false;
              }
              
              const tagId = this.storage.tagMetadata[rangeId]?.tagId;
              if (!tagId || !this.storage.tags[tagId]) {
                console.warn('Tag not found in storage:', tagId);
                return false;
              }
              
              const tag = this.storage.tags[tagId];
              
              // Get the content at the position to verify it's still valid
              const currentContent = state.doc.textBetween(position.from, position.to);
              if (!currentContent || currentContent.length === 0) {
                console.warn('No content at tag position');
                return false;
              }
              
              // Use a safer approach with commands instead of directly manipulating the transaction
              try {
                // Apply the tag mark directly using a transaction
                const markType = editor.schema.marks.tag;
                const mark = markType.create({
                  id: rangeId,
                  tagId: tagId,
                  color: tag.color,
                  name: tag.name,
                  description: tag.description,
                  content: currentContent,
                  contentBefore: this.storage.tagMetadata[rangeId]?.contentBefore,
                  contentAfter: this.storage.tagMetadata[rangeId]?.contentAfter
                });
                
                // Create a transaction directly
                const tr = state.tr;
                tr.addMark(position.from, position.to, mark);
                
                // Update content in metadata
                this.storage.tagMetadata[rangeId].content = currentContent;
                
                // Dispatch the transaction
                editor.view.dispatch(tr);
                
                // Scroll into view in a separate transaction to avoid conflicts
                setTimeout(() => {
                  try {
                    const scrollTr = editor.state.tr;
                    scrollTr.scrollIntoView();
                    editor.view.dispatch(scrollTr);
                  } catch (err) {
                    console.error('Error scrolling to tag:', err);
                  }
                }, 10);
                
                return true;
              } catch (err) {
                console.error('Error applying tag mark:', err);
                return false;
              }
            } catch (error) {
              console.error('Error navigating to tag:', error);
              return false;
            }
          }
          
          console.log('Tag not found:', rangeId);
          return false;
        } catch (error) {
          console.error('Error in findAndNavigateToTag:', error);
          return false;
        }
      },
      
      // Get all tags at a specific document position
      getTagsAtPosition: (pos: number) => ({ state }) => {
        const tags = [];
        
        // Find all marks at the position
        state.doc.nodesBetween(pos, pos, (node, nodePos) => {
          if (node.isText && pos >= nodePos && pos <= nodePos + node.nodeSize) {
            const marks = node.marks.filter(mark => mark.type.name === 'tag');
            
            for (const mark of marks) {
              // Check if position is within the mark's range
              const rangeId = mark.attrs.id;
              const tagId = mark.attrs.tagId;
              
              if (rangeId && tagId && this.storage.tags[tagId]) {
                tags.push({
                  ...this.storage.tags[tagId],
                  rangeId,
                });
              }
            }
            
            return false; // Stop iteration once we've found our node
          }
          return true;
        });
        
        return tags;
      },
      
      removeTag: (rangeId: string) => ({ state, chain }) => {
        // Find all marks with this range ID
        const { doc } = state;
        let found = false;
        let tagId = null;
        
        // Collect positions where this tag is applied
        const positions = [];
        
        doc.descendants((node, pos) => {
          if (!node.isText) return true;
          
          const marks = node.marks;
          if (!marks || !marks.length) return true;
          
          const tagMark = marks.find(mark => 
            mark.type.name === 'tag' && mark.attrs.id === rangeId
          );
          
          if (tagMark) {
            found = true;
            tagId = tagMark.attrs.tagId;
            positions.push({
              from: pos,
              to: pos + node.nodeSize
            });
          }
          
          return true;
        });
        
        // Remove the mark for each position
        if (found) {
          let chainCommand = chain().setMeta('allowTagRemoval', true);
          
          positions.forEach(({ from, to }) => {
            chainCommand = chainCommand
              .setTextSelection({ from, to })
              .unsetMark('tag');
          });
          
          const result = chainCommand.run();
          
          // Clean up tag metadata
          if (this.storage.tagMetadata && this.storage.tagMetadata[rangeId]) {
            delete this.storage.tagMetadata[rangeId];
          }
        
        // Call the onTagRemoved callback if provided
          if (this.options.onTagRemoved && tagId) {
          this.options.onTagRemoved(tagId, rangeId);
          }
      
          return result;
        }
        
        return false;
      },
      
      // Command to remove all tagged ranges from a document
      clearAllTags: () => ({ commands, chain }) => {
        return chain().setMeta('allowTagRemoval', true).unsetMark('tag').run();
      },
      
      // Command to reset the entire tagging state
      resetTaggingState: () => ({ commands, chain }) => {
        // Clear all tags in the document with explicit permission
        chain().setMeta('allowTagRemoval', true).unsetMark('tag').run();
        
        // Reset to default tags
        const defaultTags = this.options.defaultTags?.reduce(
          (acc, tag) => ({ ...acc, [tag.id]: tag }),
          {} as Record<string, Tag>
        ) || {};
        
        // Reset storage to defaults
        this.storage.tags = defaultTags;
        this.storage.documentTags = [];
        this.storage.tagMetadata = {};
        
        return true;
      }
    };
  },
});

// Helper function to calculate text similarity (for fuzzy matching)
function calculateSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  if (text1 === text2) return 1;
  
  // Simple character-based similarity metric
  const maxLength = Math.max(text1.length, text2.length);
  if (maxLength === 0) return 1;
  
  let matches = 0;
  const minLength = Math.min(text1.length, text2.length);
  
  for (let i = 0; i < minLength; i++) {
    if (text1[i] === text2[i]) matches++;
  }
  
  return matches / maxLength;
}

