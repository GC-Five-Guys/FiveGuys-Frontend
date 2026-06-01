import React from 'react';
import appIcon from '../assets/yggdrasil_icon_transparent.svg';

interface SidebarProps {
  treeData: any[];
  recentNotes: { name: string; path: string }[];
  selectedFolderPath: string;
  currentPath: string;
  setSelectedFolderPath: (path: string | ((prev: string) => string)) => void;
  openNote: (path: string) => void;
  handleCreateNote: () => void;
  handleCreateFolder: () => void;
  handleDelete: (path: string, type: 'file' | 'folder', name: string) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  treeData,
  recentNotes,
  selectedFolderPath,
  currentPath,
  setSelectedFolderPath,
  openNote,
  handleCreateNote,
  handleCreateFolder,
  handleDelete,
  isDarkMode,
  onToggleTheme,
}) => {
  const renderTree = (nodes: any[]) => {
    return nodes.map((node) => (
      <li key={node.path}>
        <div
          className={`tree-row ${node.type === 'folder' && selectedFolderPath === node.path ? 'selected-folder' : ''} ${node.type === 'file' && currentPath === node.path ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (node.type === 'folder') {
              setSelectedFolderPath((prev: string) => (prev === node.path ? "" : node.path));
            } else {
              openNote(node.path);
            }
          }}
        >
          {node.type === 'folder' ? (
            <span className="folder-name">📁 {node.name}</span>
          ) : (
            <span>📄 {node.name.replace('.md', '')}</span>
          )}
          <span
            className="list-delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(node.path, node.type, node.name);
            }}
          >✕</span>
        </div>
        {node.type === 'folder' && node.children && selectedFolderPath === node.path && (
          <ul className="sub-folder" style={{ paddingLeft: '12px', display: 'block' }}>
            {renderTree(node.children)}
          </ul>
        )}
      </li>
    ));
  };

  return (
    <aside id="file-sidebar">
      <div className="app-brand">
        <img src={appIcon} alt="Yggdrasil 로고" />
        <div>
          <strong>Yggdrasil</strong>
          <span>나만의 지식 일기</span>
        </div>
        <button
          type="button"
          className="theme-toggle"
          aria-pressed={isDarkMode}
          title={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
          onClick={(event) => {
            event.stopPropagation();
            onToggleTheme();
          }}
        >
          <span />
        </button>
      </div>

      <div className="sidebar-section">
        <div className="section-header">
          <h3>최근 노트</h3>
        </div>
        <ul id="recent-notes-list">
          {recentNotes.map((note) => (
            <li key={note.path} className="tree-row" onClick={() => openNote(note.path)}>
              <span>📄 {note.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-section">
        <div className="section-header">
          <h3>일기</h3>
          <div className="header-actions">
            <button onClick={handleCreateFolder} title="새 폴더">📁+</button>
            {/* 파일 생성은 현재 캘린더에서만 제공한다. 추후 사이드바 생성 UX가 필요하면 다시 노출한다. */}
            {/* <button onClick={handleCreateNote} title="새 파일">📄+</button> */}
          </div>
        </div>
        <ul id="note-list">
          {renderTree(treeData)}
        </ul>
      </div>
    </aside>
  );
};
