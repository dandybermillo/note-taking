import { Extension } from '@tiptap/core';
import { v4 as uuidv4 } from 'uuid';
import { EnhancedTagMark } from './enhanced-tag-mark';
import { Tag, TaggingOptions, TaggedRange } from './tag-types';

export const BlockAwareTaggingExtensionKey = 'blockAwareTagging';

export const BlockAwareTaggingExtension = Extension.create<TaggingOptions>({
  name: 'blockAwareTagging',
  
  addOptions() {
    return {
      onTagApplied: () => {},
      onTagRemoved: () => {},
      onDocumentTagsUpdated: () => {},
      defaultTags: [],
    };
  },
  
  addStorage() {
    return {
      tags: this.options.defaultTags?.reduce(
        (acc, tag) => ({ ...acc, [tag.id]: tag }),
        {} as Record<string, Tag>
      ) || {},
      documentTags: [] as Tag[],
      // Tag metadata for context tracking
      tagMetadata: {} as Record<string, any>,
      // Block to tags mapping
      blockTags: {} as Record<string, string[]>,
      saveTimeout: null as any,
    };
  },
  
  // Add the enhanced TagMark as an extension
  addExtensions() {
    return [
      EnhancedTagMark,
    ]
  },
  
  addCommands() {
    return {
      // Enhanced tag metadata storage
      saveTagMetadata: (rangeId: string, metadata: any) => () => {
        this.storage.tagMetadata[rangeId] = {
          ...this.storage.tagMetadata[rangeId],
          ...metadata
        };
        return true;
      },
      
      getTagMetadata: (rangeId: string) => () => {
        return this.storage.tagMetadata[rangeId] || null;
      },
      
      // Save tag data to persistent storage using the existing documentTagsMap
      saveTagData: () => ({ editor }) => {
        if (!editor) return false;
        
        // Get the document ID (from window or context)
        const documentId = (window as any).currentDocumentId || 'default-document';
        
        // Get tag data
        const tagData = {
          tags: this.storage.tags,
          documentTags: this.storage.documentTags,
          tagMetadata: this.storage.tagMetadata,
          blockTags: this.storage.blockTags
        };
        
        // Store in the documentTagsMap (existing map from editor.tsx)
        const documentTagsMap = (window as any).documentTagsMap;
        if (documentTagsMap && typeof documentTagsMap.set === 'function') {
          documentTagsMap.set(documentId, tagData);
        }
        
        console.log(`Saved tags for document ${documentId}`, tagData);
        
        return true;
      },
      
      // Load tag data from persistent storage
      loadTagData: (documentId: string) => ({ editor }) => {
        if (!editor) return false;
        
        try {
          // Get from documentTagsMap
          const documentTagsMap = (window as any).documentTagsMap;
          const tagData = documentTagsMap?.get(documentId);
          
          if (!tagData) {
            console.log(`No saved tags found for document ${documentId}`);
            return false;
          }
          
          console.log(`Loaded tags for document ${documentId}`, tagData);
          
          // Restore tag data
          this.storage.tags = tagData.tags || {};
          this.storage.documentTags = tagData.documentTags || [];
          this.storage.tagMetadata = tagData.tagMetadata || {};
          this.storage.blockTags = tagData.blockTags || {};
          
          // Force editor refresh
          editor.view.dispatch(editor.state.tr);
          
          return true;
        } catch (error) {
          console.error('Error loading tag data:', error);
          return false;
        }
      },
      
      // Trim spaces from a range - extracted to a shared function
      trimSpacesFromRange: (doc: any, start: number, end: number) => {
        const text = doc.textBetween(start, end);
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
          return { start, end }; // Return original if trimming creates invalid range
        }
        
        return { start: trimmedStart, end: trimmedEnd };
      },
      
      // Enhanced addTag with block awareness and context tracking
      addTag: (tag: Tag, start: number, end: number) => ({ chain, state }) => {
        // Trim spaces from selection using the helper function
        const { start: trimmedStart, end: trimmedEnd } = this.commands.trimSpacesFromRange(
          state.doc,
          start,
          end
        );
        
        // Ensure valid range
        if (trimmedStart >= trimmedEnd) {
          return false;
        }
        
        // Get context for robust recovery
        const contextSize = 30;
        const beforeStart = Math.max(0, trimmedStart - contextSize);
        const afterEnd = Math.min(state.doc.content.size, trimmedEnd + contextSize);
        
        const contentBefore = state.doc.textBetween(beforeStart, trimmedStart);
        const taggedContent = state.doc.textBetween(trimmedStart, trimmedEnd);
        const contentAfter = state.doc.textBetween(trimmedEnd, afterEnd);
        
        // Find which block this tag belongs to
        let blockId = null;
        state.doc.nodesBetween(trimmedStart, trimmedEnd, (node, pos) => {
          if (blockId) return false;
          
          // Find the parent block
          if (node.type.name === 'block') {
            blockId = node.attrs.id;
            return false;
          }
          
          return true;
        });
        
        // If no block found, it might be in the root document
        if (!blockId) {
          blockId = 'root';
        }
        
        // Generate a unique ID for this tag instance
        const rangeId = uuidv4();
        
        // Store the tag if it doesn't exist
        if (!this.storage.tags[tag.id]) {
          this.storage.tags[tag.id] = { ...tag, isDocumentTag: false };
        }
        
        // Store tag metadata
        this.storage.tagMetadata[rangeId] = {
          id: rangeId,
          tagId: tag.id,
          blockId,
          position: { from: trimmedStart, to: trimmedEnd },
          content: taggedContent,
          contentBefore,
          contentAfter,
          created: new Date().toISOString()
        };
        
        // Add to block-tag mapping
        if (!this.storage.blockTags[blockId]) {
          this.storage.blockTags[blockId] = [];
        }
        this.storage.blockTags[blockId].push(rangeId);
        
        // Call the onTagApplied callback if provided
        if (this.options.onTagApplied) {
          this.options.onTagApplied(
            this.storage.tags[tag.id], 
            { id: rangeId, start: trimmedStart, end: trimmedEnd, tagId: tag.id }
          );
        }
        
        // Apply the tag mark to the text
        const result = chain()
          .focus()
          .setTextSelection({ from: trimmedStart, to: trimmedEnd })
          .setMark('tag', {
            id: rangeId,
            tagId: tag.id,
            blockId,
            color: tag.color,
            name: tag.name,
            description: tag.description,
            content: taggedContent,
            contentBefore,
            contentAfter
          })
          .run();
          
        // Save the tag data if successful
        if (result) {
          this.commands.saveTagData();
        }
        
        return result;
      },
      
      // Enhanced tag finding with improved recovery strategies
      findAndNavigateToTag: (rangeId: string) => ({ editor, state }) => {
        console.log(`Searching for tag with ID: ${rangeId}`);
        
        // Try multiple recovery strategies in sequence
        let position = null;
        
        // Strategy 1: Direct ID matching (fastest)
        position = this.findTagById(rangeId, state.doc);
        
        // Strategy 2: If not found directly, try content matching
        if (!position) {
          console.log("Direct ID match failed, trying content-based recovery...");
          position = this.findTagByContent(rangeId, state);
        }
        
        // Strategy 3: Try context-based recovery
        if (!position) {
          console.log("Content match failed, trying context-based recovery...");
          position = this.findTagByContext(rangeId, state);
        }
        
        // Strategy 4: Last resort - fuzzy matching
        if (!position) {
          console.log("Context match failed, trying fuzzy matching...");
          position = this.findTagByFuzzyMatching(rangeId, state);
        }
        
        // If found by any method, navigate to it
        if (position) {
          console.log(`Tag found at position: ${position.from}-${position.to}`);
          
          // Ensure selection is done with a transaction to avoid issues
          const { tr } = state;
          tr.setSelection(state.selection.constructor.create(tr.doc, position.from, position.to));
          tr.scrollIntoView();
          editor.view.dispatch(tr);
          
          // Update tag metadata with new position
          if (this.storage.tagMetadata[rangeId]) {
            this.storage.tagMetadata[rangeId].position = position;
          }
          
          return true;
        }
        
        console.warn(`Tag with ID ${rangeId} could not be found in the document`);
        return false;
      },
      
      // Helper methods for tag finding strategies
      
      // Strategy 1: Find tag by direct ID match
      findTagById: (rangeId: string, doc: any) => {
        let foundPos = null;
        
        doc.descendants((node, pos) => {
          if (foundPos) return false;
          
          if (node.isText && node.marks && node.marks.length) {
            const tagMark = node.marks.find(mark => 
              mark.type.name === 'tag' && mark.attrs.id === rangeId
            );
            
            if (tagMark) {
              foundPos = {
                from: pos,
                to: pos + node.nodeSize
              };
              return false;
            }
          }
          
          return true;
        });
        
        return foundPos;
      },
      
      // Strategy 2: Find tag by content
      findTagByContent: (rangeId: string, state: any) => {
        const metadata = this.storage.tagMetadata[rangeId];
        if (!metadata || !metadata.content) return null;
        
        const taggedContent = metadata.content;
        const blockId = metadata.blockId;
        let position = null;
        
        // Search within the block first (if known)
        if (blockId && blockId !== 'root') {
          let blockPos = null;
          state.doc.descendants((node, pos) => {
            if (blockPos !== null) return false;
            
            if (node.type.name === 'block' && node.attrs.id === blockId) {
              blockPos = pos;
              return false;
            }
            
            return true;
          });
          
          if (blockPos !== null) {
            // Search within this block
            let found = false;
            const blockNode = state.doc.nodeAt(blockPos);
            if (blockNode) {
              state.doc.nodesBetween(blockPos, blockPos + blockNode.nodeSize, (node, pos) => {
                if (found || !node.isText) return true;
                
                if (node.text) {
                  const index = node.text.indexOf(taggedContent);
                  if (index !== -1) {
                    position = {
                      from: pos + index,
                      to: pos + index + taggedContent.length
                    };
                    found = true;
                    return false;
                  }
                }
                
                return true;
              });
            }
          }
        }
        
        // If still not found, search the entire document
        if (!position) {
          state.doc.descendants((node, pos) => {
            if (position || !node.isText) return true;
            
            if (node.text) {
              const index = node.text.indexOf(taggedContent);
              if (index !== -1) {
                position = {
                  from: pos + index,
                  to: pos + index + taggedContent.length
                };
                return false;
              }
            }
            
            return true;
          });
        }
        
        return position;
      },
      
      // Strategy 3: Find tag by surrounding context
      findTagByContext: (rangeId: string, state: any) => {
        const metadata = this.storage.tagMetadata[rangeId];
        if (!metadata || !metadata.content || 
            !metadata.contentBefore || !metadata.contentAfter) {
          return null;
        }
        
        const taggedContent = metadata.content;
        const contentBefore = metadata.contentBefore.slice(-15);
        const contentAfter = metadata.contentAfter.slice(0, 15);
        
        // Combine for context-based search
        const contextPattern = contentBefore + taggedContent + contentAfter;
        let bestPosition = null;
        let bestScore = 0;
        
        // Search for text that matches the context pattern
        state.doc.descendants((node, pos) => {
          if (!node.isText || !node.text) return true;
          
          // Need enough text to do context matching
          if (node.text.length < taggedContent.length) return true;
          
          // Look for portions that might contain our text
          for (let i = 0; i <= node.text.length - taggedContent.length; i++) {
            // Extract a chunk large enough to include context
            const startIdx = Math.max(0, i - contentBefore.length);
            const endIdx = Math.min(node.text.length, i + taggedContent.length + contentAfter.length);
            const chunk = node.text.slice(startIdx, endIdx);
            
            // Calculate similarity to our context pattern
            const similarity = this.getSimilarityScore(chunk, contextPattern);
            
            // If good enough match and better than previous ones
            if (similarity > 0.6 && similarity > bestScore) {
              bestScore = similarity;
              
              // Estimate where the actual content is within this chunk
              const actualPos = pos + i;
              bestPosition = {
                from: actualPos,
                to: actualPos + taggedContent.length
              };
            }
          }
          
          return true;
        });
        
        return bestPosition;
      },
      
      // Strategy 4: Find by fuzzy matching
      findTagByFuzzyMatching: (rangeId: string, state: any) => {
        const metadata = this.storage.tagMetadata[rangeId];
        if (!metadata || !metadata.content) return null;
        
        const taggedContent = metadata.content;
        
        // For short content, require higher similarity
        const minSimilarity = taggedContent.length < 10 ? 0.8 : 0.6;
        
        let bestPosition = null;
        let bestScore = 0;
        
        // Search all text nodes for similar content
        state.doc.descendants((node, pos) => {
          if (!node.isText || !node.text) return true;
          
          // For each text node, check windows of similar length
          const targetLength = taggedContent.length;
          const padding = Math.floor(targetLength * 0.3); // Allow some flexibility
          
          for (let i = 0; i <= node.text.length - (targetLength - padding); i++) {
            // Try different window sizes around the expected length
            for (let windowSize = targetLength - padding; windowSize <= targetLength + padding; windowSize++) {
              if (i + windowSize > node.text.length) continue;
              
              const chunk = node.text.slice(i, i + windowSize);
              const similarity = this.getSimilarityScore(chunk, taggedContent);
              
              if (similarity > minSimilarity && similarity > bestScore) {
                bestScore = similarity;
                bestPosition = {
                  from: pos + i,
                  to: pos + i + windowSize
                };
              }
            }
          }
          
          return true;
        });
        
        return bestPosition;
      },
      
      // Helper function: calculate string similarity (0-1)
      getSimilarityScore: (str1: string, str2: string) => {
        if (!str1 || !str2) return 0;
        if (str1 === str2) return 1;
        
        // Simple Levenshtein-based similarity
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 1;
        
        // Calculate Levenshtein distance
        const matrix = [];
        
        // Initialize matrix
        for (let i = 0; i <= str1.length; i++) {
          matrix[i] = [i];
        }
        
        for (let j = 0; j <= str2.length; j++) {
          matrix[0][j] = j;
        }
        
        // Fill matrix
        for (let i = 1; i <= str1.length; i++) {
          for (let j = 1; j <= str2.length; j++) {
            const cost = str1[i-1] === str2[j-1] ? 0 : 1;
            matrix[i][j] = Math.min(
              matrix[i-1][j] + 1,      // deletion
              matrix[i][j-1] + 1,      // insertion
              matrix[i-1][j-1] + cost  // substitution
            );
          }
        }
        
        const distance = matrix[str1.length][str2.length];
        return (maxLength - distance) / maxLength;
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
        
        // Save tag data
        this.commands.saveTagData();
        
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
        
        // Save tag data
        this.commands.saveTagData();
        
        return true;
      },
      
      // Get all document tags
      getDocumentTags: () => () => {
        return this.storage.documentTags;
      },
      
      // Enhanced removeTag that also updates block mappings
      removeTag: (rangeId: string) => ({ state, chain }) => {
        // Find all marks with this range ID
        const { doc } = state;
        let found = false;
        let tagId = null;
        let blockId = null;
        
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
            blockId = tagMark.attrs.blockId;
            positions.push({
              from: pos,
              to: pos + node.nodeSize
            });
          }
          
          return true;
        });
        
        // Remove the mark for each position
        if (found) {
          let chainCommand = chain();
          
          positions.forEach(({ from, to }) => {
            chainCommand = chainCommand
              .setTextSelection({ from, to })
              .unsetMark('tag');
          });
          
          const result = chainCommand.run();
          
          // Update block-tag mapping
          if (blockId && this.storage.blockTags[blockId]) {
            this.storage.blockTags[blockId] = this.storage.blockTags[blockId].filter(
              id => id !== rangeId
            );
            
            // Clean up empty arrays
            if (this.storage.blockTags[blockId].length === 0) {
              delete this.storage.blockTags[blockId];
            }
          }
          
          // Remove from tag metadata
          delete this.storage.tagMetadata[rangeId];
          
          // Call the onTagRemoved callback if provided
          if (this.options.onTagRemoved && tagId) {
            this.options.onTagRemoved(tagId, rangeId);
          }
          
          // Save tag data if successful
          if (result) {
            this.commands.saveTagData();
          }
          
          return result;
        }
        
        return false;
      },
      
      // Get all tags in a specific block
      getTagsInBlock: (blockId: string) => () => {
        const tagIds = this.storage.blockTags[blockId] || [];
        
        return tagIds.map(rangeId => {
          const metadata = this.storage.tagMetadata[rangeId];
          if (!metadata) return null;
          
          const tag = this.storage.tags[metadata.tagId];
          if (!tag) return null;
          
          return {
            rangeId,
            tag,
            metadata
          };
        }).filter(item => item !== null);
      },
      
      // Command to remove all tagged ranges from a document
      clearAllTags: () => ({ commands }) => {
        const result = commands.unsetMark('tag');
        
        // Reset storage
        this.storage.tagMetadata = {};
        this.storage.blockTags = {};
        
        // Save tag data if successful
        if (result) {
          this.commands.saveTagData();
        }
        
        return result;
      },
      
      // Command to reset the entire tagging state
      resetTaggingState: () => ({ commands }) => {
        // Clear all tags in the document
        const result = commands.unsetMark('tag');
        
        // Reset to default tags
        const defaultTags = this.options.defaultTags?.reduce(
          (acc, tag) => ({ ...acc, [tag.id]: tag }),
          {} as Record<string, Tag>
        ) || {};
        
        this.storage.tags = defaultTags;
        this.storage.documentTags = [];
        this.storage.tagMetadata = {};
        this.storage.blockTags = {};
        
        // Save tag data if successful
        if (result) {
          this.commands.saveTagData();
        }
        
        return true;
      },
      
      getTagsAtPosition: (pos: number) => ({ state }) => {
        const { doc } = state;
        const $pos = state.doc.resolve(pos);
        const marks = [];
        
        // Get all tag marks at this position
        doc.nodesBetween($pos.pos, $pos.pos + 1, (node, nodePos) => {
          if (node.isText) {
            const nodeTags = node.marks.filter(mark => mark.type.name === 'tag');
            nodeTags.forEach(mark => {
              marks.push({
                tag: this.storage.tags[mark.attrs.tagId],
                range: {
                  id: mark.attrs.id,
                  start: nodePos,
                  end: nodePos + node.nodeSize,
                  tagId: mark.attrs.tagId
                }
              });
            });
          }
        });
        
        return marks;
      },
    };
  },
  
  // Auto-save on document updates
  onUpdate() {
    // Debounce save to avoid too many saves
    clearTimeout(this.storage.saveTimeout);
    this.storage.saveTimeout = setTimeout(() => {
      this.commands.saveTagData();
    }, 500);
  }
});
