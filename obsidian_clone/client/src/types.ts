export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
}

export interface Tab {
  path: string;
  name: string;
}
