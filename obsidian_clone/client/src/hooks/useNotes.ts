import { useState, useEffect, useCallback } from 'react';
import { BackendNoteSummary, getNotes } from '../api';
import { FileNode, Tab } from '../types';

const toFileNode = (note: BackendNoteSummary): FileNode => ({
  name: note.title,
  type: 'file',
  path: note._id,
  createdAt: note.created_at,
  updatedAt: note.updated_at,
  date: note.date,
  folderId: note.folder_id,
});

export function useNotes() {
  const [treeData, setTreeData] = useState<FileNode[]>([]);
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [recentNotes, setRecentNotes] = useState<{ name: string; path: string }[]>([]);
  const [saveStatus, setSaveStatus] = useState("저장됨 ✓");

  const refreshNoteList = useCallback(async () => {
    try {
      const notes = await getNotes();
      const data = notes.map(toFileNode);
      setTreeData(data);

      const allFiles: { name: string; path: string }[] = [];
      const extractFiles = (nodes: FileNode[]) => {
        nodes.forEach((node) => {
          if (node.type === 'file') {
            allFiles.push({ name: node.name, path: node.path });
          } else if (node.children) {
            extractFiles(node.children);
          }
        });
      };
      extractFiles(data);
      setRecentNotes(allFiles.slice(-5).reverse());
    } catch (error) {
      console.error('Failed to refresh note list:', error);
    }
  }, []);

  const openNote = useCallback(async (path: string) => {
    const note = treeData.find((node) => node.type === 'file' && node.path === path);
    const name = note?.name || "";
    setOpenTabs((prev) => {
      if (!prev.find((t) => t.path === path)) {
        return [...prev, { path, name }];
      }
      return prev;
    });
    setCurrentPath(path);
  }, [treeData]);

  const closeTab = useCallback((path: string) => {
    setOpenTabs((prev) => {
      const newTabs = prev.filter((t) => t.path !== path);
      if (currentPath === path) {
        if (newTabs.length > 0) {
          setCurrentPath(newTabs[newTabs.length - 1].path);
        } else {
          setCurrentPath("");
        }
      }
      return newTabs;
    });
  }, [currentPath]);

  useEffect(() => {
    refreshNoteList();
  }, [refreshNoteList]);

  return {
    treeData,
    openTabs,
    currentPath,
    recentNotes,
    saveStatus,
    setSaveStatus,
    setOpenTabs,
    setCurrentPath,
    refreshNoteList,
    openNote,
    closeTab,
  };
}
