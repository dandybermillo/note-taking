import { Mark, mergeAttributes } from '@tiptap/core';

export const EnhancedTagMark = Mark.create({
  name: 'tag',
  
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
      blockId: {
        default: null,
        parseHTML: element => element.getAttribute('data-block-id'),
        renderHTML: attributes => {
          if (!attributes.blockId) return {};
          return { 'data-block-id': attributes.blockId };
        },
      },
      color: {
        default: '#3366FF',
        parseHTML: element => {
          // Extract color from style attribute
          const style = element.getAttribute('style') || '';
          const match = style.match(/border-bottom: 1px solid ([^;]+);/);
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
      // New attributes for content tracking
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
      }
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'span[data-tag]',
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { 'data-tag': '' },
        { 
          'class': 'tagged-text',
          'style': `background-color: ${HTMLAttributes.color}25; border-bottom: 1px solid ${HTMLAttributes.color};` 
        },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      0,
    ]
  },
});
