import { apiRequest } from './client';

export interface BackendFolder {
  _id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  order: number;
  created_at?: string;
  children?: BackendFolder[];
}

export interface FolderTreeResponse {
  tree: BackendFolder[];
}

export interface CreateFolderRequest {
  name: string;
  parent_id?: string | null;
  order?: number;
}

export const getFolders = () => (
  apiRequest<FolderTreeResponse>('/folders')
);

export const createFolder = (input: CreateFolderRequest) => (
  apiRequest<BackendFolder>('/folders', {
    method: 'POST',
    body: input,
  })
);

export const deleteFolder = (id: string) => (
  apiRequest<void>(`/folders/${id}`, {
    method: 'DELETE',
  })
);
