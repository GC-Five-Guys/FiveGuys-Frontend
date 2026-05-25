import { useState } from 'react';
import Vditor from 'vditor';
import { useNotes } from './hooks/useNotes';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { Tabs } from './components/Tabs';
import { StatusBar } from './components/StatusBar';

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
  const [vditor, setVditor] = useState<Vditor | null>(null);

  const saveNote = async (vInstance?: Vditor) => {
    const currentV = vInstance || vditor;
    const titleInput = document.getElementById('viewer-title') as HTMLInputElement;
    if (!currentPath || !currentV || !titleInput) return;

    const title = titleInput.value;
    const content = currentV.getValue();

    try {
      const response = await fetch(`/api/notes/${encodeURIComponent(currentPath)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newFileName: title, content: content })
      });

      if (response.ok) {
        const data = await response.json();
        setSaveStatus("저장됨 ✓");
        
        if (currentPath !== data.fileName) {
          setOpenTabs(prev => prev.map(t => t.path === currentPath ? { path: data.fileName, name: title } : t));
          setCurrentPath(data.fileName);
          refreshNoteList();
        }
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
              <Editor
                currentPath={currentPath}
                onSave={saveNote}
                setSaveStatus={setSaveStatus}
                vditor={vditor}
                setVditor={setVditor}
              />
            ) : (
              <div className="placeholder-view">노트를 선택하거나 새로 생성하세요.</div>
            )}
          </main>
        </>
      ) : (
        <main id="main-content">
          <div className="placeholder-view">그래프 모드 준비 중...</div>
        </main>
      )}

      {/* [Pane 4] 우측바 (Static for now as per original UI) */}
      <aside id="right-sidebar">
        <div className="search-container">
          <input type="text" id="search-input" placeholder="🔍 검색…" />
        </div>
        <div className="tags-section">
          <h4>🏷 자주 쓴 태그</h4>
          <div className="tag-group">
            <h5>주제</h5>
            <div className="tags">
              <span className="tag">#감정조절(12)</span>
              <span className="tag">#공부(8)</span>
              <span className="tag">#회사(5)</span>
            </div>
          </div>
        </div>
        <div className="calendar-section">
          <h4>📅 2026 / 5월</h4>
          <div className="placeholder-view" style={{ fontSize: '0.8rem' }}>캘린더 데이터 로드 중...</div>
        </div>
      </aside>

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
