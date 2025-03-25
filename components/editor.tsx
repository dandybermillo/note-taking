"use client"

import type React from "react"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { common, createLowlight } from "lowlight"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import Placeholder from "@tiptap/extension-placeholder"
import Image from "@tiptap/extension-image"
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import Link from "@tiptap/extension-link"
import Highlight from "@tiptap/extension-highlight"
import TextStyle from "@tiptap/extension-text-style"
import Color from "@tiptap/extension-color"
import { useEffect, useState, useRef, useCallback } from "react"
import { BotIcon, XIcon, TagIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Node } from '@tiptap/core'
import { createPortal } from 'react-dom'

// Import tagging extension
import { TaggingExtension } from "@/lib/extensions/tagging/tagging-extension"
import { Tag, TagType } from "@/lib/extensions/tagging/tag-types"

// Import document properties extension
import { DocumentPropertiesNode } from "@/lib/extensions/document-properties"
import "@/lib/extensions/document-properties/document-properties.css"

// Import AI icon component
import { AIIcon } from "@/components/ai-icon/ai-icon"
import "@/components/ai-icon/ai-icon.css"

// Import TagInput component
import { TagInput } from "@/components/toolbar/tag-input"
import "@/components/toolbar/toolbar.css"

const lowlight = createLowlight(common)

// Add the custom spacer node extension
const AISpacerNode = Node.create({
  name: 'aiSpacer',
  group: 'block',
  content: '',
  selectable: false,
  draggable: false,
  isolating: true,
  marks: '',
  
  // Add attributes support
  addAttributes() {
    return {
      id: {
        default: `spacer-${Date.now()}`,
      },
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'div.ai-input-spacer',
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', { 
      class: 'ai-input-spacer', 
      'data-type': 'ai-spacer',
      ...HTMLAttributes 
    }]
  },
})

interface EditorProps {
  content: string
  onUpdate: (content: string) => void
  minimal?: boolean
  onEditorReady?: (editor: any) => void
}

export default function Editor({ content, onUpdate, minimal = false, onEditorReady }: EditorProps) {
  const [mounted, setMounted] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ top: 0, left: 0 })
  const [showAIIcon, setShowAIIcon] = useState(false)
  const [showAIInput, setShowAIInput] = useState(false)
  const [showTagInput, setShowTagInput] = useState(false)
  const [aiQuery, setAIQuery] = useState("")
  const [aiResponse, setAIResponse] = useState("")
  const [showAIResponse, setShowAIResponse] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const aiInputRef = useRef<HTMLTextAreaElement>(null)
  const lastCursorPositionRef = useRef({ top: 0, left: 0 })
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const selectionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const spacerPositionRef = useRef<number | null>(null)
  const spacerIdRef = useRef<string>(`spacer-${Date.now()}`)
  const [spacerElement, setSpacerElement] = useState<HTMLElement | null>(null)
  const [hasSelection, setHasSelection] = useState(false)
  const [selectionRange, setSelectionRange] = useState<{from: number, to: number} | null>(null)
  const highlightedRangeRef = useRef<{from: number, to: number} | null>(null)
  
  // Add initial default tags
  const defaultTags: Tag[] = [
    { id: 'tag-1', name: 'Important', color: '#dc2626' },
    { id: 'tag-2', name: 'Todo', color: '#2563eb' },
    { id: 'tag-3', name: 'Question', color: '#7c3aed' },
    { id: 'tag-4', name: 'Idea', color: '#16a34a' },
  ];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      AISpacerNode.configure({
        HTMLAttributes: {
          id: spacerIdRef.current,
        }
      }),
      // Add document properties node extension
      DocumentPropertiesNode.configure({
        onTagsUpdated: (tags) => {
          console.log('Document tags updated:', tags);
        },
        onPropertiesUpdated: (properties) => {
          console.log('Document properties updated:', properties);
        }
      }),
      TaggingExtension.configure({
        defaultTags,
        onTagApplied: (tag: Tag, range: any) => {
          console.log('Tag applied:', tag, range);
        },
        onTagRemoved: (tagId: string, rangeId: string) => {
          console.log('Tag removed:', tagId, rangeId);
        },
        // New callback for document tags
        onDocumentTagsUpdated: (tags: Tag[]) => {
          console.log('Document tags updated via tagging extension:', tags);
        }
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "bg-muted/50 p-4 rounded-md font-mono text-sm overflow-x-auto",
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "not-prose pl-2",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "flex items-start my-1",
        },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            return `Heading ${node.attrs.level}`
          }
          return minimal
            ? "Start writing... (Use the AI assistant for formatting help)"
            : "Type '/' for commands, or just start writing..."
        },
        includeChildren: true,
      }),
      Image.configure({
        allowBase64: true,
        inline: true,
        HTMLAttributes: {
          class: "rounded-md max-w-full",
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "border-collapse table-auto w-full",
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: "border border-border bg-muted/30 p-2",
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-border p-2",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2 hover:text-primary/80",
        },
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: "bg-yellow-200 dark:bg-yellow-800 px-1 rounded",
        },
      }),
      TextStyle,
      Color,
    ],
    content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-6 py-4",
      },
      handleKeyDown: (view, event) => {
        // Show AI icon immediately when pressing Enter at the end of a line
        if (event.key === 'Enter') {
          const { state } = view
          const { selection } = state
          const { empty, $cursor } = selection
          if (empty && $cursor) {
            const isEndOfLine = $cursor.pos === $cursor.end()
            if (isEndOfLine) {
              updateCursorPosition()
              setShowAIIcon(true)
            }
          }
        }

        // Reset typing timer for other keys
        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current)
        }

        // Show AI icon after typing pause (reduced from 1000ms to 500ms)
        typingTimerRef.current = setTimeout(() => {
          updateCursorPosition()
          setShowAIIcon(true)
        }, 500)

        return false
      },
      handleClick: () => {
        // Update cursor position on click
        updateCursorPosition()
        return false
      },
    },
  })

  // Initialize document properties if new document
  useEffect(() => {
    if (editor && editor.isReady) {
      // Check if document properties node already exists
      let hasPropertiesNode = false;
      
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'documentProperties') {
          hasPropertiesNode = true;
          return false; // Stop iteration
        }
        return true;
      });
      
      // If no properties node exists, create one
      if (!hasPropertiesNode) {
        editor.commands.updateDocumentProperties({
          title: '',
          author: '',
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isExpanded: true,
        });
      }
    }
  }, [editor]);

  useEffect(() => {
    setMounted(true)

    // Add event listener for cursor movement
    const handleMouseMove = () => {
      if (editor?.isFocused) {
        updateCursorPosition()
      }
    }

    document.addEventListener("mousemove", handleMouseMove)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }
    }
  }, [])
  
  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor)
    }
  }, [editor, onEditorReady])

  // Add a selection change handler to show AI icon on text selection
  useEffect(() => {
    if (!editor) return;

    // Function to check if there's a text selection and show AI icon
    const handleSelectionUpdate = () => {
      const { state } = editor.view;
      const { empty, from, to } = state.selection;
      
      // If there's a non-empty selection, show the AI icon near the end of selection
      if (!empty && from !== to) {
        setHasSelection(true);
        // Store the selection range
        setSelectionRange({from, to});
        
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
              setCursorPosition({ 
                top: selectionEnd.top - editorRect.top, 
                left: selectionEnd.left - editorRect.left + 5 // Add slight offset
              });
              setShowAIIcon(true);
            }
          }
        }, 400); // Slight delay to avoid showing during active selection
      } else {
        setHasSelection(false);
        setSelectionRange(null);
        // If selection is cleared and we had a highlighted range, remove it
        if (highlightedRangeRef.current && !showAIInput && !showTagInput) {
          const {from, to} = highlightedRangeRef.current;
          editor.chain().focus().unsetHighlight({from, to}).run();
          highlightedRangeRef.current = null;
        }
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
  }, [editor, showAIInput, showTagInput]);

  useEffect(() => {
    if (!showAIInput || !editor) return;
    
    // Function to find and update the spacer element reference
    const findSpacerElement = () => {
      const element = document.getElementById(spacerIdRef.current);
      if (element && element !== spacerElement) {
        setSpacerElement(element);
      }
    };
    
    // Initial search for the spacer
    findSpacerElement();
    
    // Set up a mutation observer to detect when the spacer is added to the DOM
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
          findSpacerElement();
        }
      }
    });
    
    // Start observing the editor content
    if (editorRef.current) {
      observer.observe(editorRef.current, { 
        childList: true, 
        subtree: true 
      });
    }
    
    // When AI input is shown, temporarily disable the editor
    if (editor && showAIInput) {
      // This prevents any new input in the editor while the AI input is active
      editor.setOptions({
        editable: false
      });
    }
    
    return () => {
      observer.disconnect();
      
      // Re-enable editor when component unmounts or AI input is closed
      if (editor) {
        editor.setOptions({
          editable: true
        });
      }
    };
  }, [showAIInput, editor, spacerElement]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false)
    }
  }, [content, editor])

  useEffect(() => {
    // Focus the AI input when it appears
    if (showAIInput && aiInputRef.current) {
      aiInputRef.current.focus()
    }
  }, [showAIInput])

  const updateCursorPosition = () => {
    if (!editor || !editorRef.current) return

    const { view } = editor
    const { state } = view
    const { selection } = state
    const { from } = selection

    // Get coordinates of cursor
    const start = view.coordsAtPos(from)
    const editorRect = editorRef.current.getBoundingClientRect()

    const top = start.top - editorRect.top
    const left = start.left - editorRect.left

    lastCursorPositionRef.current = { top, left }
    setCursorPosition({ top, left })
  }

  // Handle opening the tag input
  const handleTagIconClick = () => {
    if (!hasSelection || !selectionRange) return;
    
    setShowAIIcon(false);
    setShowTagInput(true);
  };

  // Handle tag selection
  const handleTagSelect = (tag: Tag) => {
    if (!editor || !selectionRange) return;
    
    const { from, to } = selectionRange;
    
    // Apply the tag to the selected text
    editor.commands.addTag(tag, from, to);
    
    // Close the tag input
    setShowTagInput(false);
    
    // Hide the AI icon after a short delay
    setTimeout(() => {
      setShowAIIcon(false);
    }, 300);
  };

  const handleAIIconClick = () => {
    setShowAIIcon(false);
    setShowAIInput(true);
    setAIQuery("");
    
    // Use a unique ID for each spacer to avoid conflicts
    spacerIdRef.current = `spacer-${Date.now()}`;
    
    // Create space for AI input using the custom node
    if (editor) {
      // Get the current selection
      const { state } = editor.view;
      const { selection } = state;
      const { from, to, empty } = selection;
      
      // If there's a selection, highlight it before showing AI input
      if (!empty && selectionRange) {
        // Apply highlight to the selected text
        editor.chain().setHighlight({
          from: selectionRange.from,
          to: selectionRange.to,
          color: 'var(--highlight-color, #fef08a)', // Use CSS variable or default to light yellow
        }).run();
        
        // Keep track of the highlighted range so we can remove it later if needed
        highlightedRangeRef.current = {from: selectionRange.from, to: selectionRange.to};
      }
      
      // Insert the spacer node at cursor position with the unique ID
      editor.chain()
        .insertContentAt(empty ? from : to, {
          type: 'aiSpacer',
          attrs: {
            id: spacerIdRef.current
          }
        })
        .run();
        
      // Keep track of where we inserted the spacer
      spacerPositionRef.current = empty ? from : to;
      
      // Update cursor position to ensure UI is positioned correctly
      updateCursorPosition();
    }
  };

  const handleAIQuerySubmit = () => {
    if (!aiQuery.trim() || !editor) return

    setIsProcessing(true)

    // Simulate AI processing
    setTimeout(() => {
      const response = generateAIResponse(aiQuery)
      setAIResponse(response)
      setShowAIResponse(true)
      setIsProcessing(false)
    }, 800)
  }

  const generateAIResponse = (query: string) => {
    const lowerQuery = query.toLowerCase()

    if (lowerQuery.includes("bold") || lowerQuery.includes("strong")) {
      return "**bold text**"
    } else if (lowerQuery.includes("italic") || lowerQuery.includes("emphasize")) {
      return "*italic text*"
    } else if (lowerQuery.includes("heading") || lowerQuery.includes("title")) {
      return "# Heading"
    } else if (lowerQuery.includes("list") || lowerQuery.includes("bullet")) {
      return "- Item 1\n- Item 2\n- Item 3"
    } else if (lowerQuery.includes("code")) {
      return "```\ncode block\n```"
    } else if (lowerQuery.includes("link")) {
      return "[link text](https://example.com)"
    } else if (lowerQuery.includes("image")) {
      return "![image description](/placeholder.svg?height=200&width=400)"
    } else if (lowerQuery.includes("table")) {
      return "| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |"
    } else {
      return "I can help with formatting. Try asking for bold, italic, headings, lists, code, links, images, or tables."
    }
  }

  // Improve the clearHighlights function to be more robust
  const clearHighlights = useCallback(() => {
    if (!editor) return;
    
    // If we have a specific range to clear
    if (highlightedRangeRef.current) {
      try {
        const { from, to } = highlightedRangeRef.current;
        editor.chain().focus().unsetHighlight({ from, to }).run();
      } catch (error) {
        console.error("Error clearing specific highlight:", error);
      }
    }
    
    // As a fallback, also try to clear all highlights in the document
    try {
      // Use a direct approach to clear all highlights
      const { tr } = editor.view.state;
      let hasChanges = false;
      
      // Find all marks with the highlight type and remove them
      editor.view.state.doc.descendants((node, pos) => {
        if (node.marks && node.marks.length > 0) {
          const marks = node.marks.filter(mark => mark.type.name === 'highlight');
          if (marks.length > 0) {
            tr.removeMark(pos, pos + node.nodeSize, editor.schema.marks.highlight);
            hasChanges = true;
          }
        }
        return true;
      });
      
      // Only dispatch if we made changes
      if (hasChanges) {
        editor.view.dispatch(tr);
      }
    } catch (error) {
      console.error("Error clearing all highlights:", error);
    }
    
    // Reset our reference
    highlightedRangeRef.current = null;
  }, [editor]);

  // Strengthen the cleanup effect
  useEffect(() => {
    // When AI input is closed (changes from true to false)
    if (!showAIInput && editor) {
      // Small delay to ensure proper cleanup after other state updates
      const timeoutId = setTimeout(() => {
        clearHighlights();
      }, 150); // Slightly longer delay for more reliable cleanup
      
      return () => clearTimeout(timeoutId);
    }
  }, [showAIInput, editor, clearHighlights]);

  // Additional cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (editor && highlightedRangeRef.current) {
        clearHighlights();
      }
    };
  }, [editor, clearHighlights]);

  // Modify handleAIInputClose to explicitly clear highlights
  const handleAIInputClose = () => {
    if (!editor) return;
  
    // First clear highlights before doing anything else
    clearHighlights();
  
    // Remove the spacer node from the document
    editor.chain()
      .command(({ tr, state }) => {
        const spacerPositions: { pos: number, nodeSize: number }[] = [];
        
        state.doc.descendants((node, pos) => {
          if (node.type.name === 'aiSpacer') {
            spacerPositions.push({ pos, nodeSize: node.nodeSize });
          }
          return true;
        });
        
        spacerPositions.reverse().forEach(({ pos, nodeSize }) => {
          tr.delete(pos, pos + nodeSize);
        });
        
        return true;
      })
      .run();
    
    // Reset the AI interface
    setShowAIInput(false);
    setShowAIResponse(false);
    
    // If we had a selection, try to restore cursor to the end of it
    if (selectionRange) {
      setTimeout(() => {
        updateCursorPosition();
        setShowAIIcon(true);
      }, 100);
    }
  };

  // Update insertAIResponse to explicitly clear highlights first
  const insertAIResponse = () => {
    if (!editor || !aiResponse) return;

    // First clear highlights before doing anything else
    clearHighlights();

    // Get current cursor position before removing spacer
    const currentPos = spacerPositionRef.current;

    // Remove the spacer first using the same method as handleAIInputClose
    editor.chain()
      .command(({ tr, state }) => {
        const spacerPositions: { pos: number, nodeSize: number }[] = [];
        
        state.doc.descendants((node, pos) => {
          if (node.type.name === 'aiSpacer') {
            spacerPositions.push({ pos, nodeSize: node.nodeSize });
          }
          return true;
        });
        
        spacerPositions.reverse().forEach(({ pos, nodeSize }) => {
          tr.delete(pos, pos + nodeSize);
        });
        
        return true;
      })
      .run();

    // Insert the AI response at the remembered position where spacer was
    if (currentPos !== null) {
      editor.commands.insertContentAt(currentPos, aiResponse);
    } else {
      // Fallback to current cursor position if we don't have a stored position
      editor.commands.insertContent(aiResponse);
    }

    // Reset the AI interface
    setShowAIInput(false);
    setShowAIIcon(false);
    setAIQuery("");
    setShowAIResponse(false);
    spacerPositionRef.current = null;

    // Show the AI icon again after a delay
    setTimeout(() => {
      updateCursorPosition();
      setShowAIIcon(true);
    }, 1500);
  };

  // Add a function to resize the textarea based on its content
  const resizeTextarea = useCallback(() => {
    if (aiInputRef.current) {
      // Reset height to auto to get the correct scrollHeight
      aiInputRef.current.style.height = 'auto';
      // Set the height to scrollHeight to expand the textarea
      aiInputRef.current.style.height = `${aiInputRef.current.scrollHeight}px`;
    }
  }, []);

  // Update the effect to resize the textarea when input changes
  useEffect(() => {
    // Focus the AI input when it appears and resize it
    if (showAIInput && aiInputRef.current) {
      aiInputRef.current.focus();
      resizeTextarea();
    }
  }, [showAIInput, resizeTextarea]);

  // Get all existing tags from the editor storage
  const existingTags = editor && editor.storage.tagging
    ? Object.values(editor.storage.tagging.tags) as Tag[]
    : defaultTags;

  // Update your existing functions to handle the new textarea
  const handleAIQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAIQuery(e.target.value);
    resizeTextarea();
  };

  const handleAIQueryKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAIQuerySubmit();
    }
  };

  // Add a paste event handler
  const handleAIQueryPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Stop propagation to prevent editor from receiving the paste event
    e.stopPropagation();
    
    // Get the pasted text
    const pastedText = e.clipboardData.getData('text');
    
    // Insert the pasted text at cursor position
    if (aiInputRef.current) {
      const cursorPos = aiInputRef.current.selectionStart;
      const textBefore = aiQuery.substring(0, cursorPos);
      const textAfter = aiQuery.substring(cursorPos);
      
      // Update the state with the new text
      setAIQuery(textBefore + pastedText + textAfter);
      
      // We need to update cursor position after React re-renders
      setTimeout(() => {
        if (aiInputRef.current) {
          const newCursorPos = cursorPos + pastedText.length;
          aiInputRef.current.selectionStart = newCursorPos;
          aiInputRef.current.selectionEnd = newCursorPos;
          
          // Resize the textarea after paste
          resizeTextarea();
        }
      }, 0);
    }
  };

  if (!mounted || !editor) {
    return null
  }

  return (
    <div className="h-full flex flex-col relative" ref={editorRef}>
      <EditorContent editor={editor} className="h-full overflow-y-auto" />

      {/* Floating AI Icon with expandable toolbar */}
      {showAIIcon && !showAIInput && !showTagInput && (
        <AIIcon 
          position={{ top: cursorPosition.top - 20, left: cursorPosition.left + 8 }}
          onIconClick={handleAIIconClick}
          onTagClick={handleTagIconClick}
          hasSelection={hasSelection}
          editorRef={editorRef}
        />
      )}

      {/* Tag input UI */}
      {showTagInput && !showAIInput && (
        <TagInput
          onTagSelect={handleTagSelect}
          onCancel={() => setShowTagInput(false)}
          existingTags={existingTags}
          position={{
            top: cursorPosition.top - 200,
            left: cursorPosition.left - 150,
          }}
        />
      )}

      {/* Portal-based AI Input Field that renders inside the spacer element */}
      {showAIInput && spacerElement && createPortal(
        <div className="ai-input-container relative p-1">
          <div className="cursor-ai-input rounded-lg">
            <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg overflow-hidden">
              <div className="flex items-center p-2 border-b border-border/50">
                <BotIcon className="h-4 w-4 text-primary mr-2" />
                <span className="text-sm font-medium">AI Assistant</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 ml-auto" 
                  onClick={() => handleAIInputClose()}
                  title="Close AI Assistant"
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              </div>
              <div className="p-3">
                <div className="flex gap-2 items-center">
                  <textarea
                      ref={aiInputRef}
                      value={aiQuery}
                    onChange={handleAIQueryChange}
                    onKeyDown={handleAIQueryKeyDown}
                    onPaste={handleAIQueryPaste}
                    placeholder="Ask for help with your writing..."
                    className="flex-1 text-sm bg-muted/50 p-2 rounded-md resize-none overflow-hidden min-h-[38px] w-full border border-input focus:outline-none focus:ring-2 focus:ring-ring relative z-50"
                    rows={1}
                    autoFocus
                  />
                </div>

                {showAIResponse && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-muted/30 p-3 rounded-md">
                      <div className="prose prose-sm dark:prose-invert">
                        <pre className="text-sm font-mono whitespace-pre-wrap">{aiResponse}</pre>
                      </div>
                    </div>
                    <div className="flex justify-end mt-2 gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-xs" 
                        onClick={() => handleAIInputClose()}
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="h-7 text-xs" 
                        onClick={() => insertAIResponse()}
                      >
                        Insert
                      </Button>
                    </div>
                  </div>
                )}

                {isProcessing && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex gap-2 items-center p-3 bg-muted/30 rounded-md">
                      <div className="flex gap-1">
                        <div className="h-1.5 w-1.5 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="h-1.5 w-1.5 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="h-1.5 w-1.5 bg-primary/70 rounded-full animate-bounce"></div>
                      </div>
                      <span className="text-xs text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        spacerElement
      )}
    </div>
  )
}
