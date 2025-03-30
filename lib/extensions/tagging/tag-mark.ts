import { Mark, mergeAttributes } from '@tiptap/core';

export const TagMark = Mark.create({
  name: 'tag',
  
  // Make tag inclusive to ensure it expands to include new content
  inclusive: true,
  
  // Make the tag excludes from copying to handle splitting properly
  excludes: '_',
  
  // Make tag spanning to allow it to cross node boundaries
  spanning: true,
  
  // Add priority to ensure it doesn't get removed accidentally
  priority: 1000,
  
  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },
  
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-range-id'),
        renderHTML: attributes => {
          if (!attributes.id) return {};
          return { 'data-range-id': attributes.id };
        },
      },
      tagId: {
        default: null,
        parseHTML: element => element.getAttribute('data-tag-id'),
        renderHTML: attributes => {
          if (!attributes.tagId) return {};
          return { 'data-tag-id': attributes.tagId };
        },
      },
      color: {
        default: '#3366FF',
        parseHTML: element => {
          // Extract color from style attribute
          const style = element.getAttribute('style') || '';
          const match = style.match(/border-bottom-color: ([^;]+);/);
          return match ? match[1] : '#3366FF';
        },
        renderHTML: attributes => {
          return {}; // Color is handled in the style attribute
        },
      },
      name: {
        default: '',
        parseHTML: element => element.getAttribute('data-tag-name'),
        renderHTML: attributes => {
          if (!attributes.name) return {};
          return { 'data-tag-name': attributes.name };
        },
      },
      description: {
        default: '',
        parseHTML: element => element.getAttribute('title'),
        renderHTML: attributes => {
          if (!attributes.description) return {};
          return { 'title': attributes.description };
        },
      },
      // Content tracking attributes
      content: {
        default: '',
        parseHTML: element => element.getAttribute('data-content'),
        renderHTML: attributes => {
          if (!attributes.content) return {};
          return { 'data-content': attributes.content };
        },
      },
      contentBefore: {
        default: '',
        parseHTML: element => element.getAttribute('data-content-before'),
        renderHTML: attributes => {
          if (!attributes.contentBefore) return {};
          return { 'data-content-before': attributes.contentBefore };
        },
      },
      contentAfter: {
        default: '',
        parseHTML: element => element.getAttribute('data-content-after'),
        renderHTML: attributes => {
          if (!attributes.contentAfter) return {};
          return { 'data-content-after': attributes.contentAfter };
        },
      },
      lastUpdated: {
        default: null,
        parseHTML: element => element.getAttribute('data-last-updated'),
        renderHTML: attributes => {
          if (!attributes.lastUpdated) {
            attributes.lastUpdated = new Date().toISOString();
          }
          return { 'data-last-updated': attributes.lastUpdated };
        },
      },
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'span[data-tag]',
      },
      // Also parse <mark> tags with data-type=tag
      {
        tag: 'mark[data-type="tag"]',
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    // Extract color components for CSS variable
    const color = HTMLAttributes.color || '#3366FF';
    
    // Convert hex to RGB for CSS variable (for background opacity)
    let r = 51, g = 102, b = 255; // Default blue
    
    if (color.startsWith('#') && color.length >= 7) {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    }
    
    // Add inline styles for better compatibility and persistence
    const inlineStyle = `
      position: relative;
      background-color: rgba(${r}, ${g}, ${b}, 0.15) !important;
      border-bottom: 2px solid ${color} !important;
      border-bottom-color: ${color} !important;
      padding-bottom: 1px;
      text-decoration: none !important;
      z-index: 10;
      --tag-color: ${r}, ${g}, ${b};
      display: inline !important;
    `.trim();
    
    // Add a timestamp to track when the mark was last rendered
    const updatedTimestamp = new Date().toISOString();
    
    return [
      'mark',
      mergeAttributes(
        { 'data-tag': '' },
        { 'data-type': 'tag' },
        { 
          'class': 'tagged-text',
          'data-tag-name': HTMLAttributes.name,
          'title': HTMLAttributes.description || HTMLAttributes.name,
          'style': inlineStyle,
          'data-last-updated': updatedTimestamp,
        },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      0,
    ]
  },
  
  // Add support for text tracking
  onUpdate() {
    // This hook is called when the document updates
    // We can add logic here to handle tag position updates if needed
  },
  
  addStorage() {
    return {
      // Add any mark-specific storage if needed
    };
  },
}); 