export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
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
}

export interface TaggingState {
  tags: Record<string, Tag>;
  taggedRanges: Record<string, TaggedRange>;
}
