import { apiRequest } from './client';

export interface BackendNoteSummary {
  _id: string;
  user_id: string;
  folder_id: string | null;
  date: string;
  title: string;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BackendNote extends BackendNoteSummary {
  content: string;
  nodes?: Array<{
    label: string;
    token_type: 'tag' | 'mention' | 'object';
  }>;
}

export const getNotes = () => (
  apiRequest<BackendNoteSummary[]>('/notes')
);

export const getNote = (id: string) => (
  apiRequest<BackendNote>(`/notes/${id}`)
);
