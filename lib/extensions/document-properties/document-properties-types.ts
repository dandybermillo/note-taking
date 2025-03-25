import { Tag } from '../tagging/tag-types';

// Document tag extends the basic Tag interface
export interface DocumentTag extends Tag {
  // Document tags use the same structure as inline tags
  // This ensures compatibility with existing tag search and filtering
  // No additional fields needed
}

// Options for the document properties extension
export interface DocumentPropertiesOptions {
  onTagsUpdated?: (tags: DocumentTag[]) => void;
  onPropertiesUpdated?: (properties: DocumentPropertiesAttributes) => void;
}

// Attributes for the document properties node
export interface DocumentPropertiesAttributes {
  tags: DocumentTag[];
  title: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  isExpanded: boolean;
}

// Type to distinguish between tag types
export enum TagType {
  Document = 'document',
  Inline = 'inline',
}

// Combined tag result for search
export interface CombinedTagResult {
  tag: Tag;
  type: TagType;
  // For document tags
  documentId?: string;
  // For inline tags
  rangeId?: string;
  start?: number;
  end?: number;
  content?: string;
}
