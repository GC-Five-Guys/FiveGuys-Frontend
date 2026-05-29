import { useCallback, useEffect, useMemo, useState } from 'react';
import LoginPage from './components/LoginPage';
import { useNotes } from './hooks/useNotes';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { Tabs } from './components/Tabs';
import { StatusBar } from './components/StatusBar';
import { RightSidebar } from './components/RightSidebar';
import { TagSearchResultsView } from './components/TagSearchResultsView';
import { GraphView } from './components/GraphView';
import {
  ApiError,
  createFolder,
  createNote,
  deleteFolder,
  deleteNote,
  getAuthToken,
  updateNote,
  updateNotePartial,
} from './api';
import {
  countTopTags,
  fetchNoteTagIndex,
  flattenFiles,
  makeSnippet,
  normalizeTagLabel,
  NoteTagIndexEntry,
  TagType,
} from './utils/tagSearch';
import { FileNode } from './types';

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getFileDateKey = (file: FileNode) => {
  if (file.date) {
    return file.date;
  }

  const fileDate = file.name.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
  if (fileDate) {
    return fileDate[1];
  }

  return file.createdAt ? toDateKey(new Date(file.createdAt)) : '';
};

function MainApp() {
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
  const [isDarkMode, setIsDarkMode] = useState(false);
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

  const calendarNotes = useMemo(() => (
    flattenFiles(treeData)
      .filter((file) => getFileDateKey(file))
      .map((file) => ({
        path: file.path,
        title: file.name.replace('.md', ''),
        createdAt: file.createdAt || '',
        dateKey: getFileDateKey(file),
      }))
  ), [treeData]);

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

  const currentNote = useMemo(() => (
    flattenFiles(treeData).find((file) => file.path === currentPath)
  ), [currentPath, treeData]);
  const selectedFolder = useMemo(() => {
    const findFolder = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.type === 'folder' && node.path === selectedFolderPath) {
          return node;
        }

        if (node.children) {
          const found = findFolder(node.children);
          if (found) return found;
        }
      }

      return null;
    };

    return selectedFolderPath ? findFolder(treeData) : null;
  }, [selectedFolderPath, treeData]);

  const saveNote = async (content: string) => {
    if (!currentPath) return;

    try {
      await updateNote(currentPath, {
        title: currentNote?.name || '제목 없는 일기',
        content,
      });
      setSaveStatus("저장됨 ✓");
      loadTagIndex();
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus("저장 실패");
    }
  };

  const handleCreateNote = async () => {
    const title = prompt(selectedFolder
      ? `'${selectedFolder.name}' 폴더에 생성할 일기 제목을 입력하세요:`
      : '생성할 일기 제목을 입력하세요:');
    if (!title) return;

    try {
      const note = await createNote({
        date: toDateKey(new Date()),
        title,
        content: '',
      });

      if (selectedFolderPath) {
        await updateNotePartial(note._id, { folder_id: selectedFolderPath });
      }

      await refreshNoteList();
      openNote(note._id);
    } catch (error) {
      console.error(error);
      if (error instanceof ApiError && error.status === 409) {
        alert('이미 오늘 작성된 일기가 있습니다.');
      } else {
        alert('일기 생성에 실패했습니다.');
      }
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('생성할 폴더 이름을 입력하세요:');
    if (!folderName) return;
    try {
      await createFolder({
        name: folderName,
        parent_id: selectedFolderPath || null,
        order: 0,
      });
      await refreshNoteList();
    } catch (error) {
      console.error(error);
      alert('폴더 생성에 실패했습니다.');
    }
  };

  const handleDelete = async (path: string, type: 'file' | 'folder', name: string) => {
    const msg = type === 'folder' 
      ? `폴더 '${name}'과 내부 파일을 모두 삭제하시겠습니까?` 
      : `'${name.replace('.md', '')}' 일기를 삭제하시겠습니까?`;
      
    if (!confirm(msg)) return;

    try {
      if (type === 'file') {
        await deleteNote(path);
        closeTab(path);
        await refreshNoteList();
        return;
      }

      await deleteFolder(path);
      if (selectedFolderPath === path) {
        setSelectedFolderPath("");
      }
      await refreshNoteList();
    } catch (error) {
      console.error(error);
      alert(type === 'folder' ? '폴더 삭제에 실패했습니다.' : '일기 삭제에 실패했습니다.');
    }
  };

  const handleOpenTagResult = (path: string) => {
    openNote(path);
    setActiveTagSearch(null);
  };

  const handleCalendarDateClick = async (dateKey: string) => {
    const existingNote = calendarNotes.find((note) => note.dateKey === dateKey);

    setActiveView('file');
    setActiveTagSearch(null);

    if (existingNote) {
      openNote(existingNote.path);
      return;
    }

    if (!confirm(`${dateKey} 일기를 생성할까요?`)) return;

    try {
      const note = await createNote({
        date: dateKey,
        title: dateKey,
        content: '',
      });
      await refreshNoteList();
      openNote(note._id);
    } catch (error) {
      console.error(error);
      if (error instanceof ApiError && error.status === 409) {
        alert('이미 해당 날짜의 일기가 있습니다.');
      } else {
        alert('일기를 생성하지 못했습니다.');
      }
    }
  };

  return (
    <div id="app-container" data-theme={isDarkMode ? 'dark' : 'light'} onClick={() => setShowSettings(false)}>
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
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((current) => !current)}
      />

      {activeView === 'file' ? (
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
                title={currentNote?.name || ''}
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
      ) : (
        <main id="main-content">
          <GraphView
            notes={tagIndex}
            isDarkMode={isDarkMode}
            onOpenNote={(path) => {
              openNote(path);
              setActiveView('file');
            }}
          />
        </main>
      )}

      {activeView === 'file' && (
        <RightSidebar
          selectedTagType={selectedTagType}
          searchQuery={tagSearchQuery}
          topTags={topTags}
          calendarNotes={calendarNotes}
          onTagTypeChange={setSelectedTagType}
          onSearchQueryChange={setTagSearchQuery}
          onSearchSubmit={() => runTagSearch()}
          onTopTagClick={(type, label) => runTagSearch(type, label)}
          onCalendarDateClick={handleCalendarDateClick}
        />
      )}

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

function App() {

  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getAuthToken()));

  if (!isLoggedIn) {

    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;

  }

  return <MainApp />;

}

export default App;
