import React, { FormEvent } from 'react';
import { TagCount, TagType, tagMeta } from '../utils/tagSearch';

interface RightSidebarProps {
  selectedTagType: TagType;
  searchQuery: string;
  topTags: Record<TagType, TagCount[]>;
  onTagTypeChange: (type: TagType) => void;
  onSearchQueryChange: (query: string) => void;
  onSearchSubmit: () => void;
  onTopTagClick: (type: TagType, label: string) => void;
}

const tagTypes: TagType[] = ['topic', 'person', 'object'];

export const RightSidebar: React.FC<RightSidebarProps> = ({
  selectedTagType,
  searchQuery,
  topTags,
  onTagTypeChange,
  onSearchQueryChange,
  onSearchSubmit,
  onTopTagClick,
}) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearchSubmit();
  };

  return (
    <aside id="right-sidebar">
      <section className="tag-search-panel">
        <h4>태그 검색</h4>
        <div className="tag-type-toggle" role="group" aria-label="태그 타입 선택">
          {tagTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={selectedTagType === type ? 'active' : ''}
              onClick={() => onTagTypeChange(type)}
            >
              {tagMeta[type].marker}
            </button>
          ))}
        </div>
        <form className="tag-search-form" onSubmit={handleSubmit}>
          <span className={`tag-search-prefix ${selectedTagType}`}>
            {tagMeta[selectedTagType].marker}
          </span>
          <input
            type="text"
            id="search-input"
            value={searchQuery}
            placeholder={`${tagMeta[selectedTagType].label} 태그 검색`}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
          <button type="submit">검색</button>
        </form>
      </section>

      <section className="tags-section">
        <h4>자주 쓴 태그</h4>
        {tagTypes.map((type) => (
          <div className="tag-group" key={type}>
            <h5>{tagMeta[type].label}</h5>
            <div className="tags">
              {topTags[type].map((tag) => (
                <button
                  key={tag.label}
                  type="button"
                  className={`tag ${type}`}
                  onClick={() => onTopTagClick(type, tag.label)}
                >
                  {tagMeta[type].marker}{tag.label}({tag.count})
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="calendar-section">
        <h4>2026 / 5월</h4>
        <div className="placeholder-view" style={{ fontSize: '0.8rem' }}>캘린더 데이터 로드 중...</div>
      </section>
    </aside>
  );
};
