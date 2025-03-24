import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { DecorationSet, Decoration } from '@tiptap/pm/view';
import { v4 as uuidv4 } from 'uuid';
import { Tag, TaggedRange, TaggingOptions, TaggingState } from './tag-types';

export const TaggingExtensionKey = new PluginKey('tagging');

export const TaggingExtension = Extension.create<TaggingOptions>({
  name: 'tagging',

  addOptions() {
    return {
      onTagApplied: () => {},
      onTagRemoved: () => {},
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
        if (!currentTags[tag.id]) {
          this.storage.tags = {
            ...currentTags,
            [tag.id]: tag,
          };
        }
        
        // Add the tagged range
        this.storage.taggedRanges = {
          ...currentRanges,
          [rangeId]: taggedRange,
        };
        
        // Call the onTagApplied callback if provided
        if (this.options.onTagApplied) {
          this.options.onTagApplied(tag, taggedRange);
        }
        
        // Force a re-render of decorations
        this.editor.view.dispatch(this.editor.state.tr.setMeta(TaggingExtensionKey, this.storage));
        
        return true;
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
