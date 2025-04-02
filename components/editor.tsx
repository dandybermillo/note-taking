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

// Utility function for debouncing
function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;
  
  const debounced = function(this: any, ...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
  
  debounced.cancel = function() {
    clearTimeout(timeout);
  };
  
  return debounced;
}
import { BotIcon, XIcon, TagIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Node } from '@tiptap/core'
import { createPortal } from 'react-dom'

// Import tagging extension
import { TaggingExtension, TaggingExtensionKey } from "@/lib/extensions/tagging/tagging-extension"
import { Tag, TagType } from "@/lib/extensions/tagging/tag-types"

// Import document properties extension
import { DocumentPropertiesNode } from "@/lib/extensions/document-properties"
import { forceDocumentPropertiesInitialization } from "@/lib/extensions/document-properties/force-initialization"
import "@/lib/extensions/document-properties/document-properties.css"

// Import whitespace extension
import { WhitespaceExtension } from "@/lib/extensions/whitespace-extension"

// Import AI icon component
import { AIIcon } from "@/components/ai-icon/ai-icon"
import "@/components/ai-icon/ai-icon.css"

// Import TagInput component
import { TagInput } from "@/components/toolbar/dynamic-tag-input"
import "@/components/toolbar/toolbar.css"

// Import tag inline UI
import { setupTagInlineUI } from '@/lib/extensions/tagging/tag-inline-ui'

// Import the TagCursorFix extension
import { TagCursorFix } from "@/lib/extensions/tagging/tag-cursor-fix"

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

// Store outside component to persist across renders
// This map stores tag information for each document to prevent tags from carrying over
const documentTagsMap = new Map<string, any>();

interface EditorProps {
  content: string
  onUpdate: (content: string) => void
  minimal?: boolean
  onEditorReady?: (editor: any) => void
  documentId?: string // Add documentId prop
}

export default function Editor({ content, onUpdate, minimal = false, onEditorReady, documentId }: EditorProps) {
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
  const prevDocumentIdRef = useRef<string | undefined>(documentId)
  const [isRestoringTags, setIsRestoringTags] = useState(false)
  
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
        // Ensure the built-in HTML processing preserves whitespace
        html: {
          preserveWhitespace: true,
        }
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
      // Add whitespace preservation extension
      WhitespaceExtension,
      // Add cursor fix extension for tags
      TagCursorFix,
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
    content: content || "",
    onUpdate: ({ editor }) => {
      try {
        const html = editor.getHTML();
        onUpdate(html);
      } catch (error) {
        console.error("Error getting HTML content:", error);
      }
    },
    autofocus: false,
    editable: true,
    immediatelyRender: false,
    parseOptions: {
      preserveWhitespace: 'full',
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-6 py-4 whitespace-pre-wrap"
      },
      transformPastedText(text) {
        // Preserve whitespace in pasted text
        return text;
      },
      // Ensure whitespace is preserved during HTML parsing
      parseHTML: (html) => {
        return html;
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

  // Initialize document properties right after editor is ready
  useEffect(() => {
    if (editor && editor.isReady) {
      console.log("Editor is ready, initializing document properties");
      
      // Immediate execution to create document properties
      const initializeProperties = () => {
        // Check if document properties node already exists
        let hasPropertiesNode = false;
        
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'documentProperties') {
            hasPropertiesNode = true;
            console.log("Found existing properties node:", node.attrs);
            
            // Make sure it's expanded regardless
            if (node.attrs.isExpanded === false) {
              editor.commands.updateAttributes('documentProperties', {
                isExpanded: true
              });
              console.log("Forced document properties to expanded state");
            }
            return false; // Stop iteration
          }
          return true;
        });
        
        // If no properties node exists, create one
        if (!hasPropertiesNode) {
          console.log("No properties node found, creating one");
          
          // Extract title from first heading if available
          let autoTitle = '';
          
          editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'heading' && node.attrs.level === 1) {
              autoTitle = node.textContent;
              return false; // Stop after finding the first h1
            }
            return true;
          });
          
          try {
            // Create properties node using direct transaction for more reliable insertion
            const tr = editor.state.tr;
            const node = editor.schema.nodes.documentProperties.create({
              title: autoTitle,
              author: '',
              tags: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isExpanded: false
            });
            
            tr.insert(0, node);
            editor.view.dispatch(tr);
            
            console.log("Document properties node created via direct transaction");
          } catch (error) {
            console.error("Error creating properties node with transaction:", error);
            
            // Fallback to command method
            try {
              editor.commands.updateDocumentProperties({
                title: autoTitle,
                author: '',
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isExpanded: false,
              });
              
              console.log("Document properties node created via command");
            } catch (cmdError) {
              console.error("Error creating properties with command:", cmdError);
              
              // Final fallback to force initialization
              if (typeof forceDocumentPropertiesInitialization === 'function') {
                forceDocumentPropertiesInitialization(editor);
              }
            }
          }
        }
      };
      
      // Execute immediately to create document properties as soon as possible
      initializeProperties();
      
      // Also run it after a slight delay to ensure it happens after all initializations
      setTimeout(initializeProperties, 100);
      
      // Define a function for the transaction handler
      const handleDocumentPropertiesCheck = () => {
        // Check if properties node exists after each transaction
        let hasPropertiesNode = false;
        let isFirstNode = false;
        
        if (editor.state.doc.content.size > 0) {
          editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'documentProperties') {
              hasPropertiesNode = true;
              // Check if it's the first node in the document
              isFirstNode = pos === 0;
              // Ensure it's expanded
              if (node.attrs.isExpanded === false) {
                editor.commands.updateAttributes('documentProperties', {
                  isExpanded: true
                });
              }
              return false; // Stop iteration
            }
            
            // If we've checked the first node and it's not properties, stop
            if (pos === 0) {
              return false; // Not the first node, no need to check more
            }
            
            return true;
          });
          
          // If properties node doesn't exist, or it's not the first node, recreate it
          if (!hasPropertiesNode) {
            // Code to create properties node directly
            try {
              // Extract title from first heading if available
              let autoTitle = '';
              
              editor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'heading' && node.attrs.level === 1) {
                  autoTitle = node.textContent;
                  return false; // Stop after finding the first h1
                }
                return true;
              });
              
              // Create properties node directly
              const tr = editor.state.tr;
              const node = editor.schema.nodes.documentProperties.create({
                title: autoTitle,
                author: '',
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isExpanded: false
              });
              
              tr.insert(0, node);
              editor.view.dispatch(tr);
            } catch (error) {
              // Try forcing initialization as a last resort
              if (typeof forceDocumentPropertiesInitialization === 'function') {
                forceDocumentPropertiesInitialization(editor);
              }
            }
          } else if (!isFirstNode) {
            // Properties exists but is not the first node
            // This is a complex case, we should move it to the top
            try {
              // First find the current properties node
              let propertiesNode = null;
              let propertiesPos = -1;
              
              editor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'documentProperties') {
                  propertiesNode = node;
                  propertiesPos = pos;
                  return false; // Stop iteration
                }
                return true;
              });
              
              if (propertiesNode && propertiesPos !== 0) {
                // Make sure it's expanded before moving
                const attrs = {...propertiesNode.attrs, isExpanded: true};
                
                // Delete it from current position
                let tr = editor.state.tr.delete(
                  propertiesPos, 
                  propertiesPos + propertiesNode.nodeSize
                );
                
                // Create a new one at the beginning with expanded state
                const newNode = editor.schema.nodes.documentProperties.create(attrs);
                tr = tr.insert(0, newNode);
                
                // Apply the changes
                editor.view.dispatch(tr);
              }
            } catch (error) {
              console.error("Error moving document properties to top:", error);
            }
          }
        }
      };
      
      // Add a transaction handler to ensure properties node always exists
      editor.on('transaction', handleDocumentPropertiesCheck);
      
      // Cleanup function
      return () => {
        if (editor && editor.off) {
          editor.off('transaction', handleDocumentPropertiesCheck);
        }
      };
    }
  }, [editor]);
  
  // Synchronize document title on content changes
  useEffect(() => {
    if (!editor) return;
    
    // Create a synchronization function
    const syncDocumentTitle = () => {
      // Only proceed if document has changed
      if (!editor.isEditable) return;
      
      // Extract the first H1 heading as potential title
      let firstHeadingText = '';
      
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading' && node.attrs.level === 1) {
          firstHeadingText = node.textContent;
          return false; // Stop after finding the first h1
        }
        return true;
      });
      
      // Update document properties if first heading exists and has changed
      if (firstHeadingText) {
        let documentProperties = null;
        
        // Find document properties node
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'documentProperties') {
            documentProperties = node;
            return false; // Stop iteration
          }
          return true;
        });
        
        // Update title only if it's not already set manually
        if (documentProperties && !documentProperties.attrs.title) {
          editor.commands.updateDocumentProperties({
            title: firstHeadingText,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    };
    
    // Debounce the sync to avoid too many updates
    const debouncedSync = debounce(syncDocumentTitle, 1000);
    
    // Add the update event listener
    editor.on('update', ({ editor, transaction }) => {
      if (transaction.docChanged) {
        debouncedSync();
      }
    });
    
    // Initial sync
    syncDocumentTitle();
    
    // Cleanup
    return () => {
      // Properly unregister the event
      if (editor && editor.off) {
        editor.off('update');
      }
      // Also make sure to cancel any pending debounced calls
      if (debouncedSync && typeof debouncedSync.cancel === 'function') {
        debouncedSync.cancel();
      }
    };
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

    // Position the popup above the cursor with a 50px offset
    const top = start.top - editorRect.top - 50
    const left = start.left - editorRect.left

    // Ensure the left position stays within the editor boundaries
    const adjustedLeft = Math.min(
      left,
      editorRect.width - 300 // Assuming popup width ~300px
    )

    lastCursorPositionRef.current = { top, left: adjustedLeft }
    setCursorPosition({ top, left: adjustedLeft })
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
    
    // Remember the current cursor position
    const endPos = to;
    
    // Apply the tag to the selected text
    editor.commands.addTag(tag, from, to);
    
    // Close the tag input
    setShowTagInput(false);
    
    // Explicitly re-position the cursor after a short delay
    // to ensure the cursor position change happens after all transactions are complete
    setTimeout(() => {
      if (editor && !editor.isDestroyed) {
        // Use the chain API with focus to ensure cursor is visible
        editor.chain()
          .focus()
          .setTextSelection(endPos)
          .run();
      }
    }, 10);
    
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
        // Apply highlight to the selected text with a lower z-index
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

  // Function to save current document's tag state
  const saveCurrentDocumentTags = useCallback((docId: string) => {
    if (!editor || !docId) return;
    
    try {
      // First, synchronize the tag metadata with the actual visual tags in the document
      // This ensures we capture any tags that were added, moved or modified since last save
      const updatedTagMetadata = { ...editor.storage.tagging.tagMetadata };
      const foundTagIds = new Set<string>(); // Track which tags were found in the document
      
      // Scan the document to find all visible tag marks and update metadata accordingly
      editor.state.doc.descendants((node, pos) => {
        if (!node.isText || !node.marks.length) return true;
        
        // Look for tag marks on this node
        const tagMarks = node.marks.filter(mark => mark.type.name === 'tag');
        
        for (const mark of tagMarks) {
          const rangeId = mark.attrs.id;
          const tagId = mark.attrs.tagId;
          
          if (rangeId && tagId) {
            // Mark this tag as found in the document
            foundTagIds.add(rangeId);
            
            // Calculate node end position
            const endPos = pos + node.nodeSize;
            
            // Get the content and surrounding context
            const contextSize = 30;
            const beforeStart = Math.max(0, pos - contextSize);
            const afterEnd = Math.min(editor.state.doc.content.size, endPos + contextSize);
            
            const content = node.text;
            const contentBefore = editor.state.doc.textBetween(beforeStart, pos);
            const contentAfter = editor.state.doc.textBetween(endPos, afterEnd);
            
            // Update metadata with current position and content
            updatedTagMetadata[rangeId] = {
              ...(updatedTagMetadata[rangeId] || {}),
              id: rangeId,
              tagId: tagId,
              position: { from: pos, to: endPos },
              content: content,
              contentBefore: contentBefore,
              contentAfter: contentAfter,
              // Include tag attributes for better restoration
              color: mark.attrs.color,
              name: mark.attrs.name,
              description: mark.attrs.description,
              // Preserve creation timestamp if it exists
              created: updatedTagMetadata[rangeId]?.created || new Date().toISOString(),
              // Add last updated timestamp
              updated: new Date().toISOString()
            };
          }
        }
        
        return true;
      });
      
      // Create the final tag metadata object - only include tags that still exist in the document
      const finalTagMetadata = {};
      for (const [key, value] of Object.entries(updatedTagMetadata)) {
        if (foundTagIds.has(key)) {
          finalTagMetadata[key] = value;
        }
      }
      
      // Update the editor storage with synchronized metadata
      editor.storage.tagging.tagMetadata = finalTagMetadata;
      
      // Now save the synchronized state
      const currentTaggingState = {
        tags: { ...editor.storage.tagging.tags } || {},
        documentTags: [...editor.storage.tagging.documentTags] || [],
        tagMetadata: { ...finalTagMetadata } || {},
        // Add document metadata
        documentInfo: {
          id: docId,
          lastSaved: new Date().toISOString(),
          tagCount: Object.keys(finalTagMetadata).length
        }
      };
      
      // Store by document ID
      documentTagsMap.set(docId, currentTaggingState);
      console.log(`Saved tag state for document ${docId} with ${Object.keys(finalTagMetadata).length} tags`);
    } catch (error) {
      console.error('Error saving document tags:', error);
    }
  }, [editor]);
  
  // Function to reset tagging state when switching documents
  const resetTaggingState = useCallback(() => {
    if (!editor) return;
    
    // Clear all tags from the document
    editor.commands.clearAllTags();
    
    // Reset to default state
    editor.commands.resetTaggingState();
    
    console.log('Reset tagging state');
  }, [editor]);
  
  // Enhanced function to restore tags from storage for a document
  const restoreTagsFromStorage = useCallback((docId: string) => {
    if (!editor || !docId) return;
    
    const savedState = documentTagsMap.get(docId);
    if (savedState) {
      console.log(`Restoring tag state for document ${docId}`, savedState);
      
      // Set the flag to indicate tags are being restored
      setIsRestoringTags(true);
      
      // Restore the saved tags and document tags to the editor storage
      editor.storage.tagging.tags = savedState.tags;
      editor.storage.tagging.documentTags = savedState.documentTags;
      
      // Restore tag metadata for content-based recovery
      if (savedState.tagMetadata) {
        editor.storage.tagging.tagMetadata = savedState.tagMetadata;
      }
      
      // First update storage state and allow editor to stabilize before applying tags
      editor.view.dispatch(editor.state.tr.setMeta(TaggingExtensionKey, editor.storage.tagging));

      // Delay tag application to ensure editor state is stable
      setTimeout(() => {
        try {
          // Only attempt to restore tags after editor has fully updated
          if (!editor.isDestroyed && savedState.tagMetadata) {
            // First clear any existing tag marks to prevent duplicates
            const clearTr = editor.state.tr;
            const markType = editor.schema.marks.tag;
            
            if (markType) {
              // Remove all existing tag marks from the document
              editor.state.doc.descendants((node, pos) => {
                if (node.isText && node.marks.some(m => m.type.name === 'tag')) {
                  clearTr.removeMark(pos, pos + node.nodeSize, markType);
                  return false; // Continue with other nodes
                }
                return true;
              });
              
              // Apply the clearing transaction
              editor.view.dispatch(clearTr);
            }
            
            // Create a queue of tags to process for content-based recovery
            const tagQueue = Object.values(savedState.tagMetadata);
            
            // First try to find exact content matches for all tags
            const contentMatches = new Map();
            editor.state.doc.descendants((node, pos) => {
              if (!node.isText) return true;
              
              const text = node.text || '';
              
              // Check each tag's content against this text
              for (const metadata of tagQueue) {
                if (metadata.content && text.includes(metadata.content)) {
                  const index = text.indexOf(metadata.content);
                  const from = pos + index;
                  const to = from + metadata.content.length;
                  
                  if (from >= 0 && to <= editor.state.doc.content.size) {
                    contentMatches.set(metadata.id, { from, to });
                  }
                }
              }
              
              return true;
            });
            
            // Now process tags with the found positions
            const processNextTag = (index = 0) => {
              if (index >= tagQueue.length) {
                // All tags processed, mark restoration as complete
                setIsRestoringTags(false);
                return;
              }
              
              const metadata = tagQueue[index];
              try {
                if (!metadata.tagId || !savedState.tags[metadata.tagId]) {
                  // Skip if tag definition is missing
                  setTimeout(() => processNextTag(index + 1), 20);
                  return;
                }
                
                const tag = savedState.tags[metadata.tagId];
                
                // Check if we found a content match for this tag
                let position = null;
                if (contentMatches.has(metadata.id)) {
                  position = contentMatches.get(metadata.id);
                } else if (metadata.position) {
                  // Fall back to stored position if valid
                  const isPositionValid = 
                    metadata.position.from >= 0 && 
                    metadata.position.to <= editor.state.doc.content.size &&
                    metadata.position.from < metadata.position.to;
                  
                  if (isPositionValid) {
                    position = metadata.position;
                  } else {
                    // Try content-based recovery as a last resort
                    if (metadata.content && metadata.content.length > 0) {
                      let found = false;
                      let foundPos = null;
                      
                      // Search for the content in the document
                      editor.state.doc.descendants((node, pos) => {
                        if (found || !node.isText) return true;
                        
                        const text = node.text || '';
                        const index = text.indexOf(metadata.content);
                        
                        if (index !== -1) {
                          // Found potential match
                          const from = pos + index;
                          const to = from + metadata.content.length;
                          
                          // Validate found position
                          if (from >= 0 && to <= editor.state.doc.content.size) {
                            found = true;
                            foundPos = { from, to };
                            return false; // Stop searching
                          }
                        }
                        
                        return true;
                      });
                      
                      if (found && foundPos) {
                        position = foundPos;
                      }
                    }
                  }
                }
                
                // If we have a valid position, apply the tag
                if (position && position.from >= 0 && position.to <= editor.state.doc.content.size) {
                  try {
                    // Get current text at the position to ensure tags are applied correctly
                    const currentContent = editor.state.doc.textBetween(
                      position.from, 
                      position.to
                    );
                    
                    // Only apply if there's actual content
                    if (currentContent && currentContent.trim().length > 0) {
                      // Create the mark directly
                      const mark = editor.schema.marks.tag.create({
                        id: metadata.id,
                        tagId: metadata.tagId,
                        color: tag.color || metadata.color,
                        name: tag.name || metadata.name,
                        description: tag.description || metadata.description,
                        content: currentContent,
                        contentBefore: metadata.contentBefore,
                        contentAfter: metadata.contentAfter,
                        lastUpdated: new Date().toISOString()
                      });
                      
                      // Apply mark using a direct transaction
                      const { from, to } = position;
                      const tr = editor.state.tr;
                      tr.addMark(from, to, mark);
                      editor.view.dispatch(tr);
                      
                      // Update the tag metadata position
                      metadata.position = { from, to };
                      metadata.content = currentContent;
                      
                      console.log(`Successfully restored tag ${metadata.id} at position ${from}-${to}`);
                    } else {
                      console.warn(`Empty content at position for tag ${metadata.id}, skipping`);
                    }
                  } catch (markError) {
                    console.error('Error applying tag mark:', markError);
                  }
                } else {
                  console.log(`Could not find position for tag ${metadata.id}, content: "${metadata.content}"`);
                }
              } catch (error) {
                console.error('Error processing tag:', error);
              }
              
              // Process next tag with delay to prevent transaction conflicts
              setTimeout(() => processNextTag(index + 1), 20);
            };
            
            // Start processing the tag queue
            processNextTag();
          }
        } catch (error) {
          console.error('Error in tag restoration process:', error);
        }
      }, 500); // Increased timeout from 250ms to 500ms
    }
  }, [editor]);

  // Add auto-save functionality to ensure tags are saved periodically
  useEffect(() => {
    if (!editor || !documentId) return;
    
    // Save tags whenever document content changes
    const handleDocChange = debounce(() => {
      saveCurrentDocumentTags(documentId);
    }, 2000); // 2 second debounce
    
    // Setup event listeners for document changes
    const updateListener = ({ editor, transaction }) => {
      if (transaction.docChanged) {
        handleDocChange();
      }
    };
    
    editor.on('update', updateListener);
    
    // Clean up
    return () => {
      editor.off('update', updateListener);
      handleDocChange.cancel();
    };
  }, [editor, documentId, saveCurrentDocumentTags]);

  // Handle document ID changes
  useEffect(() => {
    if (editor && documentId) {
      const isDocumentChanged = prevDocumentIdRef.current !== documentId;
      
      if (isDocumentChanged) {
        console.log(`Switching from document ${prevDocumentIdRef.current} to ${documentId}`);
        
        // Save tags from the document we're leaving
        if (prevDocumentIdRef.current) {
          saveCurrentDocumentTags(prevDocumentIdRef.current);
        }
        
        // Only reset tags if we're not in the middle of restoring
        if (!isRestoringTags) {
          console.log('Loading document and applying tags:', documentId);
          
          // Don't reset tags when loading a document that might have tags
          // Instead, just directly restore tags if they exist
          const savedState = documentTagsMap.get(documentId);
          if (savedState && Object.keys(savedState).length > 0) {
            // Just restore without resetting
            setTimeout(() => {
              restoreTagsFromStorage(documentId);
            }, 100);
          } else {
            // No saved tags exist, safe to reset
            resetTaggingState();
          }
        } else {
          console.log('Skip resetting tags - restoration in progress');
        }
        
        // Update reference
        prevDocumentIdRef.current = documentId;
      }
    }
  }, [documentId, editor, saveCurrentDocumentTags, resetTaggingState, restoreTagsFromStorage, isRestoringTags]);

  // Also fix the TagMark CSS styling by adding a rule to the document head
  useEffect(() => {
    // Add CSS for tag mark to ensure proper z-index
    if (typeof document !== 'undefined') {
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        .ProseMirror mark[data-type="tag"] {
          z-index: 10;
          position: relative;
        }
        
        /* Ensure highlights have lower z-index than tags */
        .ProseMirror mark.highlight {
          z-index: 5;
          position: relative;
        }
      `;
      document.head.appendChild(styleEl);
      
      return () => {
        document.head.removeChild(styleEl);
      };
    }
  }, []);

  useEffect(() => {
    if (editor && documentId) {
      // Setup a recurrent tag reapplication mechanism
      const tagMonitorInterval = setInterval(() => {
        if (editor.isDestroyed) {
          clearInterval(tagMonitorInterval);
          return;
        }
        
        // Check if we have tags in storage but none visible in the document
        const savedState = documentTagsMap.get(documentId);
        if (!savedState || !savedState.tagMetadata) return;
        
        const tagCount = Object.keys(savedState.tagMetadata).length;
        if (tagCount === 0) return;
        
        // Count visible tags in the document
        let visibleTagCount = 0;
        editor.state.doc.descendants((node, pos) => {
          if (node.isText && node.marks.some(m => m.type.name === 'tag')) {
            visibleTagCount++;
          }
          return true;
        });
        
        // If tags in storage but none visible, reapply them
        if (tagCount > 0 && visibleTagCount === 0) {
          console.log(`Tag monitor detected missing tags: ${tagCount} in storage, ${visibleTagCount} visible. Reapplying...`);
          restoreTagsFromStorage(documentId);
        }
      }, 1000); // Check every second
      
      // Clean up interval on unmount
      return () => {
        clearInterval(tagMonitorInterval);
      };
    }
  }, [editor, documentId, restoreTagsFromStorage]);

  // Add this useEffect to initialize the inline UI
  useEffect(() => {
    if (editor) {
      console.log("Initializing tag inline UI in editor component");
      
      // Make editor available globally for the inline UI
      window.editor = editor;
      
      // Setup the tag inline UI
      setupTagInlineUI();
      
      // Add custom window object to help with debugging
      if (typeof window !== 'undefined') {
        (window as any).editorInstance = editor;
      }
    }
    
    return () => {
      // Clean up global reference when component unmounts
      if (window.editor === editor) {
        window.editor = undefined;
        if (typeof window !== 'undefined') {
          (window as any).editorInstance = undefined;
        }
      }
    };
  }, [editor]);

  if (!mounted || !editor) {
    return null
  }

  return (
    <div className="h-full w-full flex flex-col relative" ref={editorRef}>
      <EditorContent 
        editor={editor} 
        className="flex-1 overflow-y-auto w-full"
      />

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
