import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNotes } from './hooks/useNotes';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { Tabs } from './components/Tabs';
import { StatusBar } from './components/StatusBar';
import { RightSidebar } from './components/RightSidebar';
import { TagSearchResultsView } from './components/TagSearchResultsView';
import {
  countTopTags,
  fetchNoteTagIndex,
  makeSnippet,
  normalizeTagLabel,
  NoteTagIndexEntry,
  TagType,
} from './utils/tagSearch';

function App() {
  const {
    treeData,
    openTabs,
    currentPath,
    recentNotes,
    saveStatus,
    setSaveStatus,
    refreshNoteList,
    openNote,
    closeTab,
    setCurrentPath,
    setOpenTabs,
  } = useNotes();

  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("");
  const [activeView, setActiveView] = useState<'file' | 'graph'>('file');
  const [showSettings, setShowSettings] = useState(false);
  const [tagIndex, setTagIndex] = useState<NoteTagIndexEntry[]>([]);
  const [selectedTagType, setSelectedTagType] = useState<TagType>('topic');
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [activeTagSearch, setActiveTagSearch] = useState<{ type: TagType; query: string } | null>(null);

  const loadTagIndex = useCallback(async () => {
    if (!treeData.length) {
      setTagIndex([]);
      return;
    }

    try {
      const nextIndex = await fetchNoteTagIndex(treeData);
      setTagIndex(nextIndex);
    } catch (error) {
      console.error('Failed to load tag index:', error);
    }
  }, [treeData]);

  useEffect(() => {
    loadTagIndex();
  }, [loadTagIndex]);

  const topTags = useMemo(() => countTopTags(tagIndex), [tagIndex]);

  const tagSearchResults = useMemo(() => {
    if (!activeTagSearch) return [];

    return tagIndex
      .filter((note) => note.tags[activeTagSearch.type].includes(activeTagSearch.query))
      .map((note) => ({
        path: note.path,
        title: note.title,
        tags: note.tags,
        snippet: makeSnippet(note.content, activeTagSearch.query),
      }));
  }, [activeTagSearch, tagIndex]);

  const runTagSearch = useCallback((type = selectedTagType, query = tagSearchQuery) => {
    const normalizedQuery = normalizeTagLabel(query);
    if (!normalizedQuery) {
      setActiveTagSearch(null);
      return;
    }

    setSelectedTagType(type);
    setTagSearchQuery(normalizedQuery);
    setActiveView('file');
    setActiveTagSearch({ type, query: normalizedQuery });
  }, [selectedTagType, tagSearchQuery]);

  const saveNote = async (content: string) => {
    if (!currentPath) return;

    try {
      const response = await fetch(`/api/notes/${encodeURIComponent(currentPath)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content })
      });

      if (response.ok) {
        setSaveStatus("저장됨 ✓");
        loadTagIndex();
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleCreateNote = async () => {
    const fileName = prompt(selectedFolderPath ? `'${selectedFolderPath}' 폴더에 생성할 일기 제목을 입력하세요:` : '생성할 일기 제목을 입력하세요:');
    if (!fileName) return;

    const fullFileName = selectedFolderPath ? `${selectedFolderPath}/${fileName}` : fileName;

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: fullFileName }),
      });
      if (response.ok) {
        const data = await response.json();
        await refreshNoteList();
        openNote(data.fileName);
      }
    } catch (error) { console.error(error); }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('생성할 폴더 이름을 입력하세요:');
    if (!folderName) return;
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName })
      });
      if (response.ok) await refreshNoteList();
    } catch (error) { console.error(error); }
  };

  const handleDelete = async (path: string, type: 'file' | 'folder', name: string) => {
    const msg = type === 'folder' 
      ? `폴더 '${name}'과 내부 파일을 모두 삭제하시겠습니까?` 
      : `'${name.replace('.md', '')}' 일기를 삭제하시겠습니까?`;
      
    if (!confirm(msg)) return;

    try {
      const response = await fetch(`/api/notes/${encodeURIComponent(path)}`, { method: 'DELETE' });
      if (response.ok) {
        if (type === 'folder' && selectedFolderPath === path) setSelectedFolderPath("");
        if (type === 'file') closeTab(path);
        await refreshNoteList();
      }
    } catch (error) { console.error(error); }
  };

  const handleOpenTagResult = (path: string) => {
    openNote(path);
    setActiveTagSearch(null);
  };

  return (
    <div id="app-container" onClick={() => setShowSettings(false)}>
      {/* [Pane 1] 세로 메뉴바 */}
      <nav id="vertical-menu">
        <div className="menu-top">
          <button 
            className={`menu-item ${activeView === 'file' ? 'active' : ''}`} 
            title="파일 모드"
            onClick={() => setActiveView('file')}
          >📁</button>
          <button 
            className={`menu-item ${activeView === 'graph' ? 'active' : ''}`} 
            title="그래프 모드"
            onClick={() => setActiveView('graph')}
          >🌐</button>
        </div>
        <div className="menu-bottom">
          <button 
            id="settings-btn" 
            className="menu-item" 
            title="설정"
            onClick={(e) => {
              e.stopPropagation();
              setShowSettings(!showSettings);
            }}
          >⚙</button>
        </div>
      </nav>

      {activeView === 'file' ? (
        <>
          <Sidebar
            treeData={treeData}
            recentNotes={recentNotes}
            selectedFolderPath={selectedFolderPath}
            currentPath={currentPath}
            setSelectedFolderPath={setSelectedFolderPath}
            openNote={openNote}
            handleCreateNote={handleCreateNote}
            handleCreateFolder={handleCreateFolder}
            handleDelete={handleDelete}
          />

          <main id="main-content">
            <Tabs
              openTabs={openTabs}
              currentPath={currentPath}
              onTabClick={openNote}
              onTabClose={closeTab}
            />
            {currentPath ? (
              activeTagSearch ? (
                <TagSearchResultsView
                  query={activeTagSearch.query}
                  tagType={activeTagSearch.type}
                  results={tagSearchResults}
                  onOpenNote={handleOpenTagResult}
                  onClear={() => setActiveTagSearch(null)}
                />
              ) : (
              <Editor
                currentPath={currentPath}
                onSave={saveNote}
                setSaveStatus={setSaveStatus}
              />
              )
            ) : (
              activeTagSearch ? (
                <TagSearchResultsView
                  query={activeTagSearch.query}
                  tagType={activeTagSearch.type}
                  results={tagSearchResults}
                  onOpenNote={handleOpenTagResult}
                  onClear={() => setActiveTagSearch(null)}
                />
              ) : (
                <div className="placeholder-view">노트를 선택하거나 새로 생성하세요.</div>
              )
            )}
          </main>
        </>
      ) : (
        <main id="main-content">
          <div className="placeholder-view">그래프 모드 준비 중...</div>
        </main>
      )}

      <RightSidebar
        selectedTagType={selectedTagType}
        searchQuery={tagSearchQuery}
        topTags={topTags}
        onTagTypeChange={setSelectedTagType}
        onSearchQueryChange={setTagSearchQuery}
        onSearchSubmit={() => runTagSearch()}
        onTopTagClick={(type, label) => runTagSearch(type, label)}
      />

      <StatusBar saveStatus={saveStatus} />

      {showSettings && (
        <div id="settings-menu" className="floating-menu" onClick={(e) => e.stopPropagation()}>
          <div className="setting-item">
            <label>Background</label>
            <input type="color" defaultValue="#191919" />
          </div>
          <button onClick={() => alert('Theme reset!')}>Reset Theme</button>
        </div>
      )}
    </div>
  );
}

export default App;
