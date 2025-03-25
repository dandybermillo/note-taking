import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { DecorationSet, Decoration } from '@tiptap/pm/view';
import { v4 as uuidv4 } from 'uuid';
import { Tag, TaggedRange, TaggingOptions, TaggingState, TagType } from './tag-types';

export const TaggingExtensionKey = new PluginKey('tagging');

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
    return {
      tags: this.options.defaultTags?.reduce(
        (acc, tag) => ({ ...acc, [tag.id]: tag }),
        {} as Record<string, Tag>
      ) || {},
      taggedRanges: {} as Record<string, TaggedRange>,
    };
  },

  addCommands() {
    return {
      addTag: (tag: Tag, start: number, end: number) => ({ commands }) => {
        // Generate a unique ID for this tagged range
        const rangeId = uuidv4();
        
        // Create the tagged range
        const taggedRange: TaggedRange = {
          id: rangeId,
          start,
          end,
          tagId: tag.id,
        };
        
        // Update the storage
        const currentTags = this.storage.tags;
        const currentRanges = this.storage.taggedRanges;
        
        // Add or update the tag
        // Mark it as not a document tag
        const tagWithType = {
          ...tag,
          isDocumentTag: false,
        };
        
        if (!currentTags[tag.id]) {
          this.storage.tags = {
            ...currentTags,
            [tag.id]: tagWithType,
          };
        }
        
        // Add the tagged range
        this.storage.taggedRanges = {
          ...currentRanges,
          [rangeId]: taggedRange,
        };
        
        // Call the onTagApplied callback if provided
        if (this.options.onTagApplied) {
          this.options.onTagApplied(tagWithType, taggedRange);
        }
        
        // Force a re-render of decorations
        this.editor.view.dispatch(this.editor.state.tr.setMeta(TaggingExtensionKey, this.storage));
        
        return true;
      },

      // Add a document-level tag (which doesn't have a range)
      addDocumentTag: (tag: Tag) => ({ commands }) => {
        // Mark this as a document tag
        const documentTag = {
          ...tag,
          isDocumentTag: true,
        };
        
        // Update the storage with the document tag
        const currentTags = this.storage.tags;
        
        // Add the tag to storage
        this.storage.tags = {
          ...currentTags,
          [tag.id]: documentTag,
        };
        
        // Call the document tags updated callback if provided
        if (this.options.onDocumentTagsUpdated) {
          const documentTags = Object.values(this.storage.tags)
            .filter(t => t.isDocumentTag) as Tag[];
          this.options.onDocumentTagsUpdated(documentTags);
        }
        
        // Force a re-render
        this.editor.view.dispatch(this.editor.state.tr.setMeta(TaggingExtensionKey, this.storage));
        
        return true;
      },
      
      // Remove a document-level tag
      removeDocumentTag: (tagId: string) => ({ commands }) => {
        // Get current tags
        const currentTags = this.storage.tags;
        
        // Check if the tag exists and is a document tag
        const tag = currentTags[tagId];
        if (!tag || !tag.isDocumentTag) return false;
        
        // Create a new tags object without this tag
        const newTags = { ...currentTags };
        delete newTags[tagId];
        
        // Update storage
        this.storage.tags = newTags;
        
        // Call the document tags updated callback if provided
        if (this.options.onDocumentTagsUpdated) {
          const documentTags = Object.values(this.storage.tags)
            .filter(t => t.isDocumentTag) as Tag[];
          this.options.onDocumentTagsUpdated(documentTags);
        }
        
        // Force a re-render
        this.editor.view.dispatch(this.editor.state.tr.setMeta(TaggingExtensionKey, this.storage));
        
        return true;
      },
      
      // Get all document tags
      getDocumentTags: () => () => {
        return Object.values(this.storage.tags)
          .filter(tag => tag.isDocumentTag);
      },
      
      removeTag: (rangeId: string) => ({ commands }) => {
        // Get the current tagged ranges
        const currentRanges = this.storage.taggedRanges;
        
        // Check if the range exists
        if (!currentRanges[rangeId]) {
          return false;
        }
        
        // Get the tag ID for callback
        const tagId = currentRanges[rangeId].tagId;
        
        // Remove the tagged range
        const updatedRanges = { ...currentRanges };
        delete updatedRanges[rangeId];
        this.storage.taggedRanges = updatedRanges;
        
        // Call the onTagRemoved callback if provided
        if (this.options.onTagRemoved) {
          this.options.onTagRemoved(tagId, rangeId);
        }
        
        // Force a re-render of decorations
        this.editor.view.dispatch(this.editor.state.tr.setMeta(TaggingExtensionKey, this.storage));
        
        return true;
      },
      
      getTagsAtPosition: (pos: number) => () => {
        // Get all tagged ranges that include this position
        const ranges = Object.values(this.storage.taggedRanges).filter(
          range => pos >= range.start && pos <= range.end
        );
        
        // Return the tags associated with these ranges
        return ranges.map(range => ({
          range,
          tag: this.storage.tags[range.tagId],
        }));
      },
    };
  },

  addProseMirrorPlugins() {
    const { tags, taggedRanges } = this.storage;
    
    return [
      new Plugin({
        key: TaggingExtensionKey,
        state: {
          init: () => {
            return { tags, taggedRanges };
          },
          apply: (transaction, oldState) => {
            const newState = transaction.getMeta(TaggingExtensionKey);
            if (newState) {
              return newState;
            }
            return oldState;
          },
        },
        props: {
          decorations: (state) => {
            const { doc } = state;
            const pluginState = this.editor.storage.tagging as TaggingState;
            const decorations: Decoration[] = [];
            
            // Create a decoration for each tagged range
            Object.values(pluginState.taggedRanges).forEach(range => {
              const tag = pluginState.tags[range.tagId];
              if (!tag) return;
              
              // Create a decoration with the tag's color as background
              decorations.push(
                Decoration.inline(range.start, range.end, {
                  class: 'tagged-text',
                  style: `background-color: ${tag.color}25; border-bottom: 1px solid ${tag.color};`,
                  'data-tag-id': tag.id,
                  'data-range-id': range.id,
                  'data-tag-name': tag.name,
                  title: tag.description || tag.name,
                })
              );
            });
            
            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
