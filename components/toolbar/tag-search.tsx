"use client"

import React, { useState, useEffect } from 'react'
import { TagIcon, SearchIcon, XIcon, FileTextIcon } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tag, TagType, TagSearchResult } from "@/lib/extensions/tagging/tag-types"
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import './tag-search.css'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

interface TagSearchProps {
  editor: any // TipTap editor instance
  onResultClick: (pos: number, tagType?: string) => void
}

export function TagSearch({ editor, onResultClick }: TagSearchProps) {
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [results, setResults] = useState<TagSearchResult[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showSearch, setShowSearch] = useState<boolean>(false)
  const [tagTypeFilter, setTagTypeFilter] = useState<TagType | null>(null)

  // Get all available tags from the editor
  useEffect(() => {
    if (!editor) return

    // Extract tags from editor storage
    const tagsFromStorage = editor.storage.tagging?.tags || {}
    setAvailableTags(Object.values(tagsFromStorage))

  }, [editor])

  // Update search results when query or selected tags change
  useEffect(() => {
    if (!editor) return
    performSearch()
  }, [searchQuery, selectedTags, tagTypeFilter, editor])

  const performSearch = () => {
    if (!editor) return

    const taggingState = editor.storage.tagging
    if (!taggingState) return

    const { tags, taggedRanges } = taggingState
    const results: TagSearchResult[] = []

    // Get document content as string for previews
    const docContent = editor.state.doc.textContent

    // First add document-level tags if not filtering by inline only
    if (tagTypeFilter !== TagType.Inline) {
      // Get document-level tags (those marked with isDocumentTag flag)
      const documentTags = Object.values(tags).filter(tag => tag.isDocumentTag)
      
      documentTags.forEach((tag: any) => {
        // Skip if we have selected tags and this tag is not in the selection
        if (selectedTags.length > 0 && !selectedTags.includes(tag.id)) {
          return
        }

        // Skip if we have a search query and it doesn't match tag name
        if (searchQuery && !tag.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          return
        }

        // Add result for document tag
        results.push({
          id: `doc-${tag.id}`,
          tag,
          type: TagType.Document,
          documentId: 'current' // We're only searching the current document
        })
      })
    }

    // Then add inline tags if not filtering by document only
    if (tagTypeFilter !== TagType.Document) {
      // Filter ranges based on selected tags and search query
      Object.values(taggedRanges).forEach((range: any) => {
        const tag = tags[range.tagId]
        
        if (!tag || tag.isDocumentTag) return

        // Skip if we have selected tags and this tag is not in the selection
        if (selectedTags.length > 0 && !selectedTags.includes(tag.id)) {
          return
        }

        // Skip if we have a search query and it doesn't match tag name or content
        if (searchQuery) {
          const lowerQuery = searchQuery.toLowerCase()
          const tagMatches = tag.name.toLowerCase().includes(lowerQuery)
          
          // Get content for this range
          const rangeContent = docContent.substring(range.start, range.end).toLowerCase()
          const contentMatches = rangeContent.includes(lowerQuery)
          
          if (!tagMatches && !contentMatches) return
        }

        // Extract preview text (up to 50 chars)
        const start = Math.max(0, range.start - 25)
        const end = Math.min(docContent.length, range.end + 25)
        let preview = docContent.substring(start, end)
        
        // Add ellipsis if needed
        if (start > 0) preview = "..." + preview
        if (end < docContent.length) preview = preview + "..."

        // Add result for inline tag
        results.push({
          id: `${range.id}-${tag.id}`,
          tag,
          type: TagType.Inline,
          rangeId: range.id,
          start: range.start,
          end: range.end,
          content: preview
        })
      })
    }

    setResults(results)
  }

  const handleTagSelection = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handleResultClick = (result: TagSearchResult) => {
    // Handle differently based on tag type
    if (result.type === TagType.Document) {
      // For document tags, scroll to top and expand properties panel
      if (editor) {
        // Pass document tag type to the callback
        onResultClick(0, 'document');
      }
    } else {
      // For inline tags, navigate to the tag position as before
      if (editor && result.start !== undefined) {
        editor.commands.setTextSelection(result.start);
        onResultClick(result.start, 'inline');
      }
    }
  }

  const toggleSearch = () => {
    setShowSearch(!showSearch)
    if (!showSearch) {
      // Refresh available tags when opening search
      if (editor) {
        const tagsFromStorage = editor.storage.tagging?.tags || {}
        setAvailableTags(Object.values(tagsFromStorage))
      }
    }
  }

  // Handle tag type filter
  const handleTagTypeFilter = (type: TagType | null) => {
    setTagTypeFilter(type === tagTypeFilter ? null : type)
  }

  return (
    <div className="tag-search relative">
      <Button 
        variant="ghost" 
        size="sm" 
        className="flex items-center gap-1 mb-2 w-full justify-start"
        onClick={toggleSearch}
      >
        <TagIcon className="h-4 w-4" />
        <span>Tag Search</span>
        {showSearch ? (
          <XIcon className="h-3 w-3 ml-auto" />
        ) : (
          <SearchIcon className="h-3 w-3 ml-auto" />
        )}
      </Button>
      
      {showSearch && (
        <div className="animate-in slide-in-from-top duration-300 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Input
              type="text"
              placeholder="Search in tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm"
            />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2">
                  <TagIcon className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs">Filter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Tag Type</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={tagTypeFilter === TagType.Document}
                    onCheckedChange={() => handleTagTypeFilter(TagType.Document)}
                  >
                    <div className="flex items-center">
                      <FileTextIcon className="w-3.5 h-3.5 mr-2" />
                      Document Tags
                    </div>
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={tagTypeFilter === TagType.Inline}
                    onCheckedChange={() => handleTagTypeFilter(TagType.Inline)}
                  >
                    <div className="flex items-center">
                      <TagIcon className="w-3.5 h-3.5 mr-2" />
                      Inline Tags
                    </div>
                  </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuLabel>Filter by Tag</DropdownMenuLabel>
                {availableTags.length > 0 ? (
                  availableTags.map(tag => (
                    <DropdownMenuCheckboxItem
                      key={tag.id}
                      checked={selectedTags.includes(tag.id)}
                      onCheckedChange={() => handleTagSelection(tag.id)}
                    >
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                        {tag.isDocumentTag && (
                          <FileTextIcon className="w-3 h-3 ml-2 text-muted-foreground" />
                        )}
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">No tags found</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="border border-border rounded-md bg-background/50">
            <div className="p-2 text-xs font-medium border-b border-border">
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </div>
            
            <ScrollArea className="h-[200px]">
              {results.length > 0 ? (
                <div className="p-1">
                  {results.map(result => (
                    <div 
                      key={result.id}
                      className="p-2 text-sm rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: result.tag.color }}
                        />
                        <span className="text-xs font-medium">{result.tag.name}</span>
                        
                        {/* Show an icon to distinguish document-level vs. inline tags */}
                        {result.type === TagType.Document ? (
                          <FileTextIcon className="w-3 h-3 ml-1 text-muted-foreground" />
                        ) : null}
                      </div>
                      
                      {/* Show content preview for inline tags, or "Document properties" for document tags */}
                      <p className="text-xs truncate text-muted-foreground">
                        {result.type === TagType.Document 
                          ? "Document properties" 
                          : result.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No matching tagged content found
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}
      
      {showSearch && <Separator className="my-3" />}
    </div>
  )
}
