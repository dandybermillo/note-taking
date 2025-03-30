export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  // Optional field to distinguish tag type, not needed for core functionality
  // but useful for tracking the source of tags
  isDocumentTag?: boolean;
}

export enum TagType {
  Document = 'document',
  Inline = 'inline',
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
  onDocumentTagsUpdated?: (tags: Tag[]) => void;
  defaultTags?: Tag[];
}

export interface TaggingState {
  tags: Record<string, Tag>;
  taggedRanges: Record<string, TaggedRange>;
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