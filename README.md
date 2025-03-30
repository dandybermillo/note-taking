# Note Taking App with Advanced Tagging System

A Next.js-based note-taking application featuring a powerful text tagging system built with Tiptap editor.

## Features

- Rich text editing with Tiptap
- Advanced text tagging system
- Persistent tag storage
- Tag recovery and restoration
- Document-level tags
- Real-time tag updates

## Core Components

### Tagging System

The tagging system is built on top of Tiptap's extension system and includes:

- `TaggingExtension`: Core tagging functionality
- `TagMark`: Custom mark for tag visualization
- Tag persistence and recovery mechanisms
- Document-level tag management

### Key Features

- Content-aware tag persistence
- Automatic tag recovery
- Context-based tag restoration
- Tag position tracking
- Document change handling

## Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

## Project Structure

```
lib/
  ├── extensions/
  │   └── tagging/
  │       ├── tagging-extension.ts   # Core tagging functionality
  │       ├── tag-mark.ts           # Tag mark definition
  │       └── tag-types.ts          # Type definitions
components/
  └── editor/                      # Editor components
```

## Usage

```typescript
// Initialize editor with tagging extension
const editor = useEditor({
  extensions: [
    TaggingExtension.configure({
      onTagApplied: (tag, range) => {
        // Handle tag application
      },
      onTagRemoved: (tagId, rangeId) => {
        // Handle tag removal
      }
    })
  ]
})
```

## License

MIT 