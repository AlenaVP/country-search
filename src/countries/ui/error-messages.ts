import type { SearchErrorKind } from '../types/search-state.ts';

export const ERROR_MESSAGES: Record<SearchErrorKind, string> = {
  network: 'Check your connection and try again.',
  timeout: 'The server took too long to respond. Try again.',
  http: 'The server returned an error. Try again later.',
};
