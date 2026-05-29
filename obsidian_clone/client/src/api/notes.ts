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

export interface CreateNoteRequest {
  date: string;
  title: string;
  content: string;
}

export interface UpdateNoteRequest {
  title: string;
  content: string;
}

export const getNotes = () => (
  apiRequest<BackendNoteSummary[]>('/notes')
);

export const getNote = (id: string) => (
  apiRequest<BackendNote>(`/notes/${id}`)
);

export const createNote = (input: CreateNoteRequest) => (
  apiRequest<BackendNote>('/notes', {
    method: 'POST',
    body: input,
  })
);

export const updateNote = (id: string, input: UpdateNoteRequest) => (
  apiRequest<BackendNote>(`/notes/${id}`, {
    method: 'PUT',
    body: input,
  })
);

export const deleteNote = (id: string) => (
  apiRequest<void>(`/notes/${id}`, {
    method: 'DELETE',
  })
);
