"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { BoltIcon } from 'lucide-react'

interface DemoTaggerProps {
  editor: any
}

export function DemoTagger({ editor }: DemoTaggerProps) {
  const addDemoTags = () => {
    if (!editor) return
    
    // Get the current document
    const { state } = editor.view
    const { doc } = state
    
    // Get the text content to find positions to tag
    const content = doc.textContent
    
    // Find some words to tag (simple example)
    const tagWords = {
      'Welcome': { id: 'tag-1', name: 'Important', color: '#dc2626' },
      'first': { id: 'tag-2', name: 'Todo', color: '#2563eb' },
      'note': { id: 'tag-3', name: 'Question', color: '#7c3aed' },
    }
    
    // Search for these words and add tags
    Object.entries(tagWords).forEach(([word, tag]) => {
      const wordIndex = content.indexOf(word)
      
      if (wordIndex >= 0) {
        // Find the actual position in the document (accounting for nodes)
        let actualPos = 0
        let found = false
        
        doc.descendants((node, pos) => {
          if (found) return false
          
          if (node.isText) {
            const nodeText = node.text as string
            const nodeWordIndex = nodeText.indexOf(word)
            
            if (nodeWordIndex >= 0) {
              actualPos = pos + nodeWordIndex
              found = true
              return false
            }
          }
          
          return true
        })
        
        if (found) {
          // Add the tag at the found position
          editor.commands.addTag(tag, actualPos, actualPos + word.length)
        }
      }
    })
  }
  
  return (
    <Button 
      onClick={addDemoTags} 
      variant="outline" 
      size="sm" 
      className="flex items-center gap-1 text-xs"
    >
      <BoltIcon className="h-3 w-3" />
      Add Demo Tags
    </Button>
  )
}
