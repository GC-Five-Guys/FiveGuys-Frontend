import React, { FormEvent } from 'react';
import { TagCount, TagType, tagMeta } from '../utils/tagSearch';

interface CalendarNote {
  path: string;
  title: string;
  createdAt: string;
  dateKey: string;
}

interface RightSidebarProps {
  selectedTagType: TagType;
  searchQuery: string;
  topTags: Record<TagType, TagCount[]>;
  calendarNotes: CalendarNote[];
  onTagTypeChange: (type: TagType) => void;
  onSearchQueryChange: (query: string) => void;
  onSearchSubmit: () => void;
  onTopTagClick: (type: TagType, label: string) => void;
  onCalendarDateClick: (dateKey: string) => void;
}

const tagTypes: TagType[] = ['topic', 'person', 'object'];
const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
const monthOptions = Array.from({ length: 12 }, (_, index) => index);

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const RightSidebar: React.FC<RightSidebarProps> = ({
  selectedTagType,
  searchQuery,
  topTags,
  calendarNotes,
  onTagTypeChange,
  onSearchQueryChange,
  onSearchSubmit,
  onTopTagClick,
  onCalendarDateClick,
}) => {
  const [visibleMonth, setVisibleMonth] = React.useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [isMonthPickerOpen, setIsMonthPickerOpen] = React.useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearchSubmit();
  };

  const notesByDate = React.useMemo(() => {
    return calendarNotes.reduce<Record<string, CalendarNote[]>>((acc, note) => {
      const key = note.dateKey;
      acc[key] = [...(acc[key] || []), note];
      return acc;
    }, {});
  }, [calendarNotes]);

  const calendarDays = React.useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<Date | null> = Array.from({ length: firstDay.getDay() }, () => null);

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [visibleMonth]);

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const todayKey = toDateKey(new Date());
  const monthTitle = `${visibleMonth.getFullYear()} / ${visibleMonth.getMonth() + 1}월`;
  const yearOptions = React.useMemo(() => {
    const currentYear = visibleMonth.getFullYear();
    return Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);
  }, [visibleMonth]);

  const selectYear = (year: number) => {
    setVisibleMonth((current) => new Date(year, current.getMonth(), 1));
  };

  const selectMonth = (month: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), month, 1));
    setIsMonthPickerOpen(false);
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
        <div className="calendar-header">
          <div className="calendar-title-wrap">
            <button
              type="button"
              className="calendar-title-button"
              onClick={() => setIsMonthPickerOpen((open) => !open)}
              aria-expanded={isMonthPickerOpen}
            >
              {monthTitle}
            </button>
            {isMonthPickerOpen && (
              <div className="calendar-picker">
                <label>
                  연도
                  <select
                    value={visibleMonth.getFullYear()}
                    onChange={(event) => selectYear(Number(event.target.value))}
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </label>
                <div className="calendar-month-grid">
                  {monthOptions.map((month) => (
                    <button
                      key={month}
                      type="button"
                      className={visibleMonth.getMonth() === month ? 'active' : ''}
                      onClick={() => selectMonth(month)}
                    >
                      {month + 1}월
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="calendar-nav">
            <button type="button" onClick={() => moveMonth(-1)} title="이전 달">‹</button>
            <button type="button" onClick={() => moveMonth(1)} title="다음 달">›</button>
          </div>
        </div>
        <table className="calendar-table">
          <thead>
            <tr>
              {dayLabels.map((day) => (
                <th key={day}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: calendarDays.length / 7 }).map((_, weekIndex) => (
              <tr key={weekIndex}>
                {calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7).map((date, dayIndex) => {
                  if (!date) {
                    return <td key={`empty-${weekIndex}-${dayIndex}`} className="calendar-empty" />;
                  }

                  const dateKey = toDateKey(date);
                  const notes = notesByDate[dateKey] || [];
                  const hasNote = notes.length > 0;
                  const title = hasNote ? notes.map((note) => note.title).join(', ') : `${dateKey} 일기 생성`;

                  return (
                    <td key={dateKey}>
                      <button
                        type="button"
                        className={`${dateKey === todayKey ? 'today' : ''} ${hasNote ? 'has-note' : ''}`}
                        title={title}
                        onClick={() => onCalendarDateClick(dateKey)}
                      >
                        <span>{date.getDate()}</span>
                        {hasNote && <i aria-label={`${notes.length}개 노트 작성됨`} />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </aside>
  );
};
