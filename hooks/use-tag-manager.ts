import { useState, useEffect, useCallback } from 'react';
import { Tag, TagType } from '@/lib/extensions/tagging/tag-types';
import { DocumentTag } from '@/lib/extensions/document-properties/document-properties-types';

export interface TagOperations {
  addInlineTag: (tag: Tag, start: number, end: number) => void;
  removeInlineTag: (rangeId: string) => void;
  addDocumentTag: (tag: DocumentTag) => void;
  removeDocumentTag: (tagId: string) => void;
  getInlineTags: () => Tag[];
  getDocumentTags: () => DocumentTag[];
  getAllTags: () => Tag[];
  getTagsAtPosition: (pos: number) => Tag[];
}

export function useTagManager(editor: any): TagOperations {
  const [inlineTags, setInlineTags] = useState<Tag[]>([]);
  const [documentTags, setDocumentTags] = useState<DocumentTag[]>([]);
  
  // Subscribe to editor changes to keep tags in sync
  useEffect(() => {
    if (!editor) return;
    
    // Update tags from editor storage
    const updateTags = () => {
      // Get inline tags
      const taggingState = editor.storage.tagging;
      if (taggingState) {
        const inlineTags = Object.values(taggingState.tags).filter(
          (tag: any) => !tag.isDocumentTag
        );
        setInlineTags(inlineTags);
      }
      
      // Get document tags
      let docTags: DocumentTag[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'documentProperties') {
          docTags = node.attrs.tags || [];
          return false; // Stop iteration
        }
        return true;
      });
      setDocumentTags(docTags);
    };
    
    // Initial update
    updateTags();
    
    // Subscribe to changes
    const unsubscribe = editor.on('transaction', updateTags);
    
    return () => {
      unsubscribe();
    };
  }, [editor]);
  
  // Add inline tag
  const addInlineTag = useCallback((tag: Tag, start: number, end: number) => {
    if (!editor) return;
    editor.commands.addTag(tag, start, end);
  }, [editor]);
  
  // Remove inline tag
  const removeInlineTag = useCallback((rangeId: string) => {
    if (!editor) return;
    editor.commands.removeTag(rangeId);
  }, [editor]);
  
  // Add document tag
  const addDocumentTag = useCallback((tag: DocumentTag) => {
    if (!editor) return;
    editor.commands.addDocumentTag(tag);
  }, [editor]);
  
  // Remove document tag
  const removeDocumentTag = useCallback((tagId: string) => {
    if (!editor) return;
    editor.commands.removeDocumentTag(tagId);
  }, [editor]);
  
  // Get all inline tags
  const getInlineTags = useCallback(() => {
    return inlineTags;
  }, [inlineTags]);
  
  // Get all document tags
  const getDocumentTags = useCallback(() => {
    return documentTags;
  }, [documentTags]);
  
  // Get all tags (both inline and document)
  const getAllTags = useCallback(() => {
    return [...inlineTags, ...documentTags];
  }, [inlineTags, documentTags]);
  
  // Get tags at a specific position
  const getTagsAtPosition = useCallback((pos: number) => {
    if (!editor) return [];
    return editor.commands.getTagsAtPosition(pos);
  }, [editor]);
  
  return {
    addInlineTag,
    removeInlineTag,
    addDocumentTag,
    removeDocumentTag,
    getInlineTags,
    getDocumentTags,
    getAllTags,
    getTagsAtPosition,
  };
}
