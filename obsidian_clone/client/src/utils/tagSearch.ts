import { FileNode } from '../types';

export type TagType = 'topic' | 'person' | 'object';

export interface TagCount {
  label: string;
  count: number;
}

export interface NoteTagSearchResult {
  path: string;
  title: string;
  snippet: string;
  tags: Record<TagType, string[]>;
}

export interface NoteTagIndexEntry extends NoteTagSearchResult {
  content: string;
}

export const tagMeta = {
  topic: { marker: '#', label: '주제' },
  person: { marker: '@', label: '인물' },
  object: { marker: '&', label: '오브젝트' },
} as const;

const TAG_TOKEN_PATTERN = /(^|\s)([@#&])([^\s@#&]+)/g;

const markerToType: Record<string, TagType> = {
  '#': 'topic',
  '@': 'person',
  '&': 'object',
};

const dataTypeToTagType: Record<string, TagType> = {
  mention: 'person',
  person: 'person',
  topic: 'topic',
  object: 'object',
};

const emptyTags = (): Record<TagType, string[]> => ({
  topic: [],
  person: [],
  object: [],
});

export const normalizeTagLabel = (value: string) => (
  value.trim().replace(/^[@#&]/, '').replace(/[.,!?;:)\]}]+$/g, '')
);

export const flattenFiles = (nodes: FileNode[]) => {
  const files: { name: string; path: string }[] = [];

  const walk = (items: FileNode[]) => {
    items.forEach((item) => {
      if (item.type === 'file') {
        files.push({ name: item.name, path: item.path });
      } else if (item.children) {
        walk(item.children);
      }
    });
  };

  walk(nodes);
  return files;
};

export const extractTagsFromHtml = (html: string) => {
  const tags = emptyTags();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const taggedNodes = Array.from(doc.querySelectorAll('[data-type]'));

  taggedNodes.forEach((node) => {
    const rawType = node.getAttribute('data-type') || '';
    const tagType = dataTypeToTagType[rawType];
    const rawLabel = node.getAttribute('data-label') || node.getAttribute('data-id') || node.textContent || '';
    const label = normalizeTagLabel(rawLabel);

    if (tagType && label) {
      tags[tagType].push(label);
    }

    node.remove();
  });

  const plainText = doc.body.textContent || '';
  for (const match of plainText.matchAll(TAG_TOKEN_PATTERN)) {
    const [, , marker, rawLabel] = match;
    const tagType = markerToType[marker];
    const label = normalizeTagLabel(rawLabel);

    if (tagType && label) {
      tags[tagType].push(label);
    }
  }

  return tags;
};

export const uniqueTags = (tags: string[]) => Array.from(new Set(tags));

export const makeSnippet = (html: string, label: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const text = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();

  if (!text) return '본문 미리보기가 없습니다.';

  const matchIndex = text.indexOf(label);
  if (matchIndex === -1) {
    return text.length > 96 ? `${text.slice(0, 96)}...` : text;
  }

  const start = Math.max(0, matchIndex - 36);
  const end = Math.min(text.length, matchIndex + label.length + 56);
  return `${start > 0 ? '...' : ''}${text.slice(start, end)}${end < text.length ? '...' : ''}`;
};

export const countTopTags = (results: NoteTagIndexEntry[]) => {
  const counters: Record<TagType, Map<string, number>> = {
    topic: new Map(),
    person: new Map(),
    object: new Map(),
  };

  results.forEach((result) => {
    (Object.keys(counters) as TagType[]).forEach((type) => {
      result.tags[type].forEach((label) => {
        counters[type].set(label, (counters[type].get(label) || 0) + 1);
      });
    });
  });

  return (Object.keys(counters) as TagType[]).reduce<Record<TagType, TagCount[]>>((acc, type) => {
    acc[type] = Array.from(counters[type].entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 3);
    return acc;
  }, { topic: [], person: [], object: [] });
};

export const fetchNoteTagIndex = async (treeData: FileNode[]): Promise<NoteTagIndexEntry[]> => {
  const files = flattenFiles(treeData);

  const entries = await Promise.all(files.map(async (file) => {
    const response = await fetch(`/api/notes/${encodeURIComponent(file.path)}`);
    const data = await response.json();
    const content = data.content || '';
    const tags = extractTagsFromHtml(content);

    return {
      path: file.path,
      title: file.name.replace('.md', ''),
      snippet: makeSnippet(content, ''),
      tags: {
        topic: uniqueTags(tags.topic),
        person: uniqueTags(tags.person),
        object: uniqueTags(tags.object),
      },
      content,
    };
  }));

  return entries;
};
