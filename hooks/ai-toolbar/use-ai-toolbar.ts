import { useState, useRef, useEffect, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { Tag, TaggedRange } from '@/lib/extensions/tagging/tag-types';

interface UseAIToolbarOptions {
  editor: Editor | null;
}

interface UseAIToolbarReturn {
  showAIIcon: boolean;
  setShowAIIcon: (show: boolean) => void;
  iconPosition: { top: number; left: number };
  hasSelection: boolean;
  selectionRange: { from: number; to: number } | null;
  handleAIIconClick: () => void;
  handleTagSelect: (tag: Tag) => void;
  showTagInput: boolean;
  setShowTagInput: (show: boolean) => void;
  tagInputPosition: { top: number; left: number };
  existingTags: Tag[];
}

export const useAIToolbar = ({ editor }: UseAIToolbarOptions): UseAIToolbarReturn => {
  const [showAIIcon, setShowAIIcon] = useState(false);
  const [iconPosition, setIconPosition] = useState({ top: 0, left: 0 });
  const [hasSelection, setHasSelection] = useState(false);
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInputPosition, setTagInputPosition] = useState({ top: 0, left: 0 });
  const editorRef = useRef<HTMLElement | null>(null);
  const selectionTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get all existing tags from the editor storage
  const existingTags = editor && editor.storage.tagging
    ? Object.values(editor.storage.tagging.tags) as Tag[]
    : [];
  
  // Update cursor position
  const updateCursorPosition = useCallback(() => {
    if (!editor || !editorRef.current) return;
    
    const { view } = editor;
    const { state } = view;
    const { selection } = state;
    const { from } = selection;
    
    // Get coordinates of cursor
    const start = view.coordsAtPos(from);
    const editorRect = editorRef.current.getBoundingClientRect();
    
    const top = start.top - editorRect.top;
    const left = start.left - editorRect.left;
    
    setIconPosition({ top, left });
  }, [editor]);
  
  // Handle selection changes
  useEffect(() => {
    if (!editor) return;
    
    // Set the editor reference
    if (editor.options.element) {
      editorRef.current = editor.options.element;
    }
    
    // Function to check if there's a text selection and show AI icon
    const handleSelectionUpdate = () => {
      const { state } = editor.view;
      const { empty, from, to } = state.selection;
      
      // If there's a non-empty selection, show the AI icon near the end of selection
      if (!empty && from !== to) {
        setHasSelection(true);
        // Store the selection range
        setSelectionRange({ from, to });
        
        // Clear any existing selection timer
        if (selectionTimerRef.current) {
          clearTimeout(selectionTimerRef.current);
        }
        
        // Add a short delay to avoid showing the icon during active selection
        selectionTimerRef.current = setTimeout(() => {
          // Ensure selection is still present
          const currentSelection = editor.view.state.selection;
          if (!currentSelection.empty && currentSelection.from !== currentSelection.to) {
            // Get coordinates at the end of selection
            const selectionEnd = editor.view.coordsAtPos(currentSelection.to);
            const editorRect = editorRef.current?.getBoundingClientRect();
            
            if (editorRect) {
              // Position the icon near the end of selection with a slight offset
              setIconPosition({
                top: selectionEnd.top - editorRect.top,
                left: selectionEnd.left - editorRect.left + 5, // Add slight offset
              });
              setShowAIIcon(true);
            }
          }
        }, 400); // Slight delay to avoid showing during active selection
      } else {
        setHasSelection(false);
        setSelectionRange(null);
      }
    };
    
    // Set up handler for selection changes
    editor.on('selectionUpdate', handleSelectionUpdate);
    
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      if (selectionTimerRef.current) {
        clearTimeout(selectionTimerRef.current);
      }
    };
  }, [editor]);
  
  // Handle AI icon click
  const handleAIIconClick = useCallback(() => {
    if (!editor) return;
    updateCursorPosition();
  }, [editor, updateCursorPosition]);
  
  // Set tag input position
  useEffect(() => {
    setTagInputPosition({
      top: iconPosition.top - 200, // Position above the icon
      left: iconPosition.left - 150, // Position to the left of the icon
    });
  }, [iconPosition]);
  
  // Handle tag selection
  const handleTagSelect = useCallback((tag: Tag) => {
    if (!editor || !selectionRange) return;
    
    // Get the selection range
    const { from, to } = selectionRange;
    
    // Add the tag to the document
    editor.commands.addTag(tag, from, to);
    
    // Close the tag input
    setShowTagInput(false);
    
    // Hide the AI icon after a short delay
    setTimeout(() => {
      setShowAIIcon(false);
    }, 300);
  }, [editor, selectionRange]);
  
  return {
    showAIIcon,
    setShowAIIcon,
    iconPosition,
    hasSelection,
    selectionRange,
    handleAIIconClick,
    handleTagSelect,
    showTagInput,
    setShowTagInput,
    tagInputPosition,
    existingTags,
  };
};
