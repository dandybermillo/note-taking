"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Note } from "@/types/note"
import { SendIcon } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface AIChatProps {
  currentNote: Note
  onUpdateNote: (content: string) => void
}

export default function AIChat({ currentNote, onUpdateNote }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI assistant. I can help you format your note or add elements like images, tables, and code blocks. What would you like to do?",
    },
  ])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = () => {
    if (!newMessage.trim()) return

    const userMessage = { role: "user" as const, content: newMessage }
    setMessages((prev) => [...prev, userMessage])
    setNewMessage("")
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        role: "assistant" as const,
        content: generateResponse(newMessage),
      }
      setMessages((prev) => [...prev, aiResponse])
      setIsLoading(false)
    }, 1000)
  }

  const generateResponse = (message: string) => {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes("image") || lowerMessage.includes("picture") || lowerMessage.includes("photo")) {
      return "I can help you add an image. Would you like to:\n\n1. Add an image from a URL\n2. Add a placeholder image\n\nJust let me know which option you prefer."
    } else if (lowerMessage.includes("table")) {
      return "I can help you create a table. What kind of data would you like to organize in the table? Let me know the columns you need."
    } else if (lowerMessage.includes("code") || lowerMessage.includes("syntax")) {
      return "I can help you add a code block. What programming language will you be using? And what code would you like to include?"
    } else if (lowerMessage.includes("list") || lowerMessage.includes("bullet")) {
      return "I can help you create a list. Would you prefer:\n\n1. A bulleted list\n2. A numbered list\n3. A task list with checkboxes\n\nLet me know which type and what items to include."
    } else if (lowerMessage.includes("heading") || lowerMessage.includes("title")) {
      return "I can help you add a heading. What level of heading do you need (H1, H2, etc.) and what should the heading text be?"
    } else if (lowerMessage.includes("bold") || lowerMessage.includes("italic") || lowerMessage.includes("format")) {
      return "I can help with text formatting. Would you like to make text bold, italic, or apply other formatting? Let me know what text you want to format."
    } else if (lowerMessage.includes("link") || lowerMessage.includes("url")) {
      return "I can help you add a link. What's the URL you want to link to, and what text should the link display?"
    } else if (lowerMessage.includes("help") || lowerMessage.includes("can you")) {
      return "I can help you with various formatting tasks:\n\n• Adding images\n• Creating tables\n• Inserting code blocks\n• Making lists\n• Adding headings\n• Formatting text (bold, italic)\n• Creating links\n\nJust let me know what you'd like to do!"
    } else {
      return `I'll help you with "${message}". Could you provide more details about what you'd like to do with your note?`
    }
  }

  const handleFormatAction = (action: string) => {
    let updatedContent = currentNote.content

    switch (action) {
      case "image":
        updatedContent += "\n\n![Image description](/placeholder.svg?height=200&width=400)\n"
        break
      case "table":
        updatedContent +=
          "\n\n| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n| Cell 4 | Cell 5 | Cell 6 |\n"
        break
      case "code":
        updatedContent +=
          '\n\n```javascript\n// Your code here\nconst greeting = "Hello, world!";\nconsole.log(greeting);\n```\n'
        break
      case "list":
        updatedContent += "\n\n- Item 1\n- Item 2\n- Item 3\n"
        break
      case "quote":
        updatedContent +=
          "\n\n> This is a blockquote. It can span multiple lines and is great for highlighting important information.\n"
        break
      case "h1":
        updatedContent += "\n\n# Heading 1\n"
        break
      case "h2":
        updatedContent += "\n\n## Heading 2\n"
        break
      case "bold":
        updatedContent += "\n\n**Bold text**\n"
        break
      case "italic":
        updatedContent += "\n\n*Italic text*\n"
        break
      case "link":
        updatedContent += "\n\n[Link text](https://example.com)\n"
        break
    }

    onUpdateNote(updatedContent)

    // Add a message about the action
    setMessages((prev) => [
      ...prev,
      { role: "user", content: `[Added ${action}]` },
      {
        role: "assistant",
        content: `I've added a ${action} to your note. Is there anything else you'd like to add or modify?`,
      },
    ])
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h2 className="font-bold">AI Assistant</h2>
        <p className="text-xs text-muted-foreground mt-1">Ask for help or use the quick actions below</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-3 p-2 rounded-lg ${message.role === "user" ? "bg-primary/10 ml-6" : "bg-muted/50 mr-6"}`}
          >
            {message.content}
          </div>
        ))}
        {isLoading && (
          <div className="bg-muted/50 mr-6 mb-3 p-2 rounded-lg">
            <div className="flex gap-1 items-center">
              <div className="h-2 w-2 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="h-2 w-2 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="h-2 w-2 bg-primary/70 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-border">
        <div className="flex">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 rounded-r-none"
            placeholder="Ask for help..."
          />
          <Button onClick={sendMessage} className="rounded-l-none" disabled={isLoading}>
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

