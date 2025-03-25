"use client"

import { useState } from "react"
import Editor from "@/components/editor"
import AIChat from "@/components/ai-chat"
import type { Note } from "@/types/note"
import { PlusIcon, SaveIcon, PanelLeftIcon, PanelRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import Sidebar from "@/components/sidebar"
import { EditorToolbar } from "@/components/editor-toolbar"

export default function Home() {
  const [showSidebar, setShowSidebar] = useState(true)
  const [showAIChat, setShowAIChat] = useState(true)
  const [editorInstance, setEditorInstance] = useState<any>(null)
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "welcome",
      title: "Welcome Note",
      content: "# Welcome\n\nThis is your first note!",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ])
  const [currentNote, setCurrentNote] = useState<Note>(notes[0])

  const toggleAIChat = () => {
    setShowAIChat(!showAIChat)
  }

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar)
  }

  const selectNote = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId)
    if (note) {
      setCurrentNote(note)
    }
  }

  const updateCurrentNote = (content: string) => {
    const updatedNote = {
      ...currentNote,
      content,
      updatedAt: new Date(),
    }
    setCurrentNote(updatedNote)

    // Update in notes array
    setNotes((prevNotes) => prevNotes.map((note) => (note.id === currentNote.id ? updatedNote : note)))
  }

  const createNewNote = () => {
    const id = `note-${Date.now()}`
    const newNote: Note = {
      id,
      title: "New Note",
      content: "# New Note\n\nStart writing...",
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setNotes([...notes, newNote])
    setCurrentNote(newNote)
  }

  const updateNoteTitle = (id: string, title: string) => {
    setNotes((prevNotes) =>
      prevNotes.map((note) => (note.id === id ? { ...note, title, updatedAt: new Date() } : note)),
    )

    if (currentNote.id === id) {
      setCurrentNote((prev) => ({ ...prev, title }))
    }
  }

  const saveNote = () => {
    // Simulate saving with visual feedback
    const saveButton = document.getElementById("save-button")
    if (saveButton) {
      saveButton.classList.add("animate-pulse", "bg-green-500/20")
      setTimeout(() => {
        saveButton.classList.remove("animate-pulse", "bg-green-500/20")
      }, 1000)
    }

    // In a real app, this would save to a database or localStorage
    console.log("Saving note:", currentNote)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {showSidebar && (
        <Sidebar
          notes={notes}
          currentNoteId={currentNote.id}
          onSelectNote={selectNote}
          onCreateNote={createNewNote}
          onUpdateNoteTitle={updateNoteTitle}
          editor={editorInstance}
        />
      )}

      {showAIChat && (
        <div className="w-80 border-r border-border">
          <AIChat currentNote={currentNote} onUpdateNote={updateCurrentNote} />
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <div className="h-12 bg-muted/30 flex items-center px-4 justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              title={showSidebar ? "Hide Notes" : "Show Notes"}
            >
              {showSidebar ? <PanelLeftIcon className="h-5 w-5" /> : <PanelRightIcon className="h-5 w-5" />}
            </Button>
            <h2 className="font-medium truncate">{currentNote.title}</h2>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={createNewNote} title="Create New Note">
              <PlusIcon className="h-5 w-5" />
            </Button>

            <Button id="save-button" variant="ghost" size="icon" onClick={saveNote} title="Save Note">
              <SaveIcon className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleAIChat}
              title={showAIChat ? "Hide AI Assistant" : "Show AI Assistant"}
              className={showAIChat ? "text-primary" : ""}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M12 8V4H8"></path>
                <rect width="16" height="12" x="4" y="8" rx="2"></rect>
                <path d="M2 14h2"></path>
                <path d="M20 14h2"></path>
                <path d="M15 13v2"></path>
                <path d="M9 13v2"></path>
              </svg>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {editorInstance && (
            <div className="editor-toolbar">
              <EditorToolbar editor={editorInstance} />
            </div>
          )}
          <div className="flex-1">
            <Editor 
              content={currentNote.content} 
              onUpdate={updateCurrentNote} 
              minimal={true} 
              onEditorReady={(editor) => setEditorInstance(editor)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

