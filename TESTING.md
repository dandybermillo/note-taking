# Testing Document Tags Implementation

This guide walks through testing the document-level tags implementation alongside the existing inline tagging system.

## Setup

1. Start the development server:
   ```
   npm run dev
   ```

2. Open your browser to http://localhost:3000

## Testing Document Properties Panel

### Basic Properties Panel

1. Create a new note using the + button in the top toolbar
2. Observe that a document properties panel appears at the top of the document
3. Click the expand/collapse arrow to test toggling the panel

### Adding Document Tags

1. Click the "Document Tags" button in the editor toolbar
2. Enter a tag name in the input field
3. Select a color using the color picker
4. Click "Add" to create a new document tag
5. Verify the tag appears in the document properties panel at the top of the editor

### Removing Document Tags

1. Click the X button on any tag in the document properties panel
2. Verify the tag is removed

## Testing Tag Search Integration

### Search for Document Tags

1. Open the Tag Search panel in the sidebar
2. Filter by "Document Tags" using the dropdown
3. Search for a tag name you added previously
4. Verify your document tag appears in the results

### Navigate to Document Tags

1. Click on a document tag result in the tag search
2. Verify the editor scrolls to the top of the document and expands the properties panel

## Testing Inline and Document Tag Integration

### Test Both Tag Types

1. Add some document-level tags using the toolbar
2. Select text in your document and use the inline tagging feature (select text and click the tag icon)
3. Open the Tag Search panel and verify both tag types appear
4. Try filtering by tag type and by tag name
5. Click on results of each type and verify correct navigation behavior

## Edge Cases

1. **Create a Note Without Tags**: Verify the properties panel still works correctly
2. **Add Many Tags**: Add 10+ tags to test overflow behavior
3. **Long Tag Names**: Test with very long tag names to ensure UI handles them properly
4. **Delete and Recreate**: Delete all tags and then create new ones to test reset functionality
