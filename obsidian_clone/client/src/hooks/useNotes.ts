import { useState, useEffect, useCallback } from 'react';
import { BackendFolder, BackendNoteSummary, getFolders, getNotes } from '../api';
import { FileNode, Tab } from '../types';

const toFolderNode = (folder: BackendFolder): FileNode => ({
  name: folder.name,
  type: 'folder',
  path: folder._id,
  createdAt: folder.created_at,
  children: (folder.children || []).map(toFolderNode),
});

const toFileNode = (note: BackendNoteSummary): FileNode => ({
  name: note.title,
  type: 'file',
  path: note._id,
  createdAt: note.created_at,
  updatedAt: note.updated_at,
  date: note.date,
  folderId: note.folder_id,
});

const buildTreeData = (folders: BackendFolder[], notes: BackendNoteSummary[]) => {
  const tree = folders.map(toFolderNode);
  const folderMap = new Map<string, FileNode>();

  const collectFolders = (nodes: FileNode[]) => {
    nodes.forEach((node) => {
      if (node.type === 'folder') {
        folderMap.set(node.path, node);
        collectFolders(node.children || []);
      }
    });
  };

  collectFolders(tree);

  notes.forEach((note) => {
    const noteNode = toFileNode(note);
    const parent = note.folder_id ? folderMap.get(note.folder_id) : null;

    if (parent) {
      parent.children = [...(parent.children || []), noteNode];
    } else {
      tree.push(noteNode);
    }
  });

  return tree;
};

const findFileNode = (nodes: FileNode[], path: string): FileNode | null => {
  for (const node of nodes) {
    if (node.type === 'file' && node.path === path) {
      return node;
    }

    if (node.children) {
      const found = findFileNode(node.children, path);
      if (found) return found;
    }
  }

  return null;
};

export function useNotes() {
  const [treeData, setTreeData] = useState<FileNode[]>([]);
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [recentNotes, setRecentNotes] = useState<{ name: string; path: string }[]>([]);
  const [saveStatus, setSaveStatus] = useState("저장됨 ✓");

  const refreshNoteList = useCallback(async () => {
    try {
      const [folderResponse, notes] = await Promise.all([
        getFolders(),
        getNotes(),
      ]);
      const data = buildTreeData(folderResponse.tree, notes);
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

  const openNote = useCallback(async (path: string, fallbackName = "") => {
    const note = findFileNode(treeData, path);
    const name = note?.name || fallbackName;
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
