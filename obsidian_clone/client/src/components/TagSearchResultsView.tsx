import React from 'react';
import { NoteTagSearchResult, TagType, tagMeta } from '../utils/tagSearch';

interface TagSearchResultsViewProps {
  query: string;
  tagType: TagType;
  results: NoteTagSearchResult[];
  onOpenNote: (path: string) => void;
  onClear: () => void;
}

const tagTypes: TagType[] = ['topic', 'person', 'object'];

export const TagSearchResultsView: React.FC<TagSearchResultsViewProps> = ({
  query,
  tagType,
  results,
  onOpenNote,
  onClear,
}) => {
  const currentTag = `${tagMeta[tagType].marker}${query}`;

  return (
    <div id="tag-results-view" className="view-pane">
      <div className="tag-results-header">
        <button type="button" onClick={onClear}>← 편집 화면</button>
        <div>
          <p>{tagMeta[tagType].label} 태그 검색</p>
          <h2>{currentTag}</h2>
        </div>
        <span>총 {results.length}개</span>
      </div>

      {results.length > 0 ? (
        <div className="tag-result-list">
          {results.map((result) => (
            <button
              key={result.path}
              type="button"
              className="tag-result-card"
              onClick={() => onOpenNote(result.path)}
            >
              <span className="tag-result-title">📄 {result.title}</span>
              <span className="tag-result-tags">
                {tagTypes.flatMap((type) => (
                  result.tags[type].map((tag) => (
                    <span key={`${type}-${tag}`} className={`summary-tag ${type}`}>
                      {tagMeta[type].marker}{tag}
                    </span>
                  ))
                ))}
              </span>
              <span className="tag-result-snippet">{result.snippet}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="tag-result-empty">
          <strong>{currentTag} 태그가 달린 노트가 없어요</strong>
          <span>본문이나 태그 표에서 먼저 태그를 추가해보세요.</span>
        </div>
      )}
    </div>
  );
};
