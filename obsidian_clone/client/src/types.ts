export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Tab {
  path: string;
  name: string;
}
