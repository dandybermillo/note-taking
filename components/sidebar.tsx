"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Note } from "@/types/note"
import { PlusIcon, SearchIcon, FileTextIcon } from "lucide-react"

interface SidebarProps {
  notes: Note[]
  currentNoteId: string
  onSelectNote: (noteId: string) => void
  onCreateNote: () => void
  onUpdateNoteTitle: (id: string, title: string) => void
}

export default function Sidebar({ notes, currentNoteId, onSelectNote, onCreateNote, onUpdateNoteTitle }: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")

  const filteredNotes = notes.filter((note) => note.title.toLowerCase().includes(searchTerm.toLowerCase()))

  const startEditingTitle = (note: Note) => {
    setEditingNoteId(note.id)
    setEditTitle(note.title)
  }

  const saveTitle = () => {
    if (editingNoteId && editTitle.trim()) {
      onUpdateNoteTitle(editingNoteId, editTitle)
      setEditingNoteId(null)
    }
  }

  return (
    <div className="w-64 bg-muted/30 p-4 flex flex-col border-r border-border">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Notes</h1>
        <Button variant="ghost" size="icon" onClick={onCreateNote} title="Create New Note">
          <PlusIcon className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative mb-4">
        <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search notes..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className={`p-2 rounded-md mb-1 cursor-pointer flex items-center ${
              note.id === currentNoteId ? "bg-primary/10 text-primary" : "hover:bg-muted"
            }`}
            onClick={() => onSelectNote(note.id)}
            onDoubleClick={() => startEditingTitle(note)}
          >
            {editingNoteId === note.id ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                autoFocus
                className="py-0 h-6"
              />
            ) : (
              <>
                <FileTextIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{note.title}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

