export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  // Optional field to distinguish tag type, not needed for core functionality
  // but useful for tracking the source of tags
  isDocumentTag?: boolean;
}

export interface TaggedRange {
  id: string;
  start: number;
  end: number;
  tagId: string;
}

export interface TaggingOptions {
  onTagApplied?: (tag: Tag, range: TaggedRange) => void;
  onTagRemoved?: (tagId: string, rangeId: string) => void;
  defaultTags?: Tag[];
  // New callback for handling document tags
  onDocumentTagsUpdated?: (tags: Tag[]) => void;
}

export interface TaggingState {
  tags: Record<string, Tag>;
  taggedRanges: Record<string, TaggedRange>;
}

// Tag type enum for better readability when working with different tag types
export enum TagType {
  Inline = 'inline',
  Document = 'document'
}

// Extended tag search result to include both inline and document tags
export interface TagSearchResult {
  id: string;
  tag: Tag;
  type: TagType;
  // For inline tags
  rangeId?: string;
  start?: number;
  end?: number;
  content?: string;
  // For document tags
  documentId?: string;
}