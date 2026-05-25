import React, { FormEvent, useState } from 'react';

interface TagSummaryTableProps {
  tags: {
    persons: string[];
    topics: string[];
    objects: string[];
  };
  onAddTag: (type: 'topic' | 'person' | 'object', label: string) => void;
}

const tagRows = [
  {
    type: 'topic',
    tagsKey: 'topics',
    marker: '#',
    label: '주제',
    className: 'topic',
    placeholder: '감정조절',
  },
  {
    type: 'person',
    tagsKey: 'persons',
    marker: '@',
    label: '인물',
    className: 'person',
    placeholder: '엄마',
  },
  {
    type: 'object',
    tagsKey: 'objects',
    marker: '&',
    label: '오브젝트',
    className: 'object',
    placeholder: '커피',
  },
] as const;

export const TagSummaryTable: React.FC<TagSummaryTableProps> = ({ tags, onAddTag }) => {
  const [drafts, setDrafts] = useState({
    topic: '',
    person: '',
    object: '',
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>, type: 'topic' | 'person' | 'object') => {
    event.preventDefault();

    const label = drafts[type].trim().replace(/^[@#&]/, '');
    if (!label) return;

    onAddTag(type, label);
    setDrafts((prev) => ({ ...prev, [type]: '' }));
  };

  return (
    <div className="tag-summary-container">
      <table className="tag-summary-table">
        <tbody>
          {tagRows.map((row) => (
            <tr key={row.type}>
              <th scope="row" className={`${row.className}-header`}>
                <span className="tag-summary-marker">{row.marker}</span>
                {row.label}
              </th>
              <td>
                <div className="summary-tag-row">
                  <div className="summary-tag-list">
                    {tags[row.tagsKey].map((tag) => (
                      <span key={tag} className={`summary-tag ${row.className}`}>
                        {row.marker}{tag}
                      </span>
                    ))}
                  </div>
                  <form className="summary-tag-form" onSubmit={(event) => handleSubmit(event, row.type)}>
                    <span className={`summary-tag-prefix ${row.className}`}>{row.marker}</span>
                    <input
                      type="text"
                      value={drafts[row.type]}
                      placeholder={row.placeholder}
                      aria-label={`${row.label} 태그 추가`}
                      onChange={(event) => setDrafts((prev) => ({ ...prev, [row.type]: event.target.value }))}
                    />
                    <button type="submit" title={`${row.label} 태그 추가`}>+</button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
