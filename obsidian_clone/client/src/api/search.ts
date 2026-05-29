import { apiRequest } from './client';
import { BackendFolder } from './folders';
import { BackendNoteSummary } from './notes';

export type SearchTokenMarker = '#' | '@' | '&';

export interface SearchResponse {
  query: string;
  mode: 'TITLE_SEARCH' | 'TAG_FILTER_SEARCH';
  notes: BackendNoteSummary[];
  folders: BackendFolder[];
  tags: string[];
}

export interface SearchParams {
  q: string;
  type?: SearchTokenMarker;
}

export const search = ({ q, type }: SearchParams) => {
  const params = new URLSearchParams({ q });

  if (type) {
    params.set('type', type);
  }

  return apiRequest<SearchResponse>(`/search?${params.toString()}`);
};
