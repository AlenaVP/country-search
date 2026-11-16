export const HISTORY_LIMIT = 5;

const STORAGE_KEY = 'country-search:history';

export type HistoryStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Keeps the latest search queries, newest first, in the given storage (localStorage in the app, a fake in tests). */
export class SearchHistory {
  constructor(private readonly storage: HistoryStorage) {}

  list(): string[] {
    try {
      const saved: unknown = JSON.parse(this.storage.getItem(STORAGE_KEY) ?? '[]');

      return Array.isArray(saved) ? saved.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }

  /** A query that the new one starts with is dropped: it is either the same query or its unfinished beginning. */
  add(query: string): string[] {
    const earlier = this.list().filter((item) => !query.startsWith(item));
    const history = [query, ...earlier].slice(0, HISTORY_LIMIT);

    this.save(history);

    return history;
  }

  private save(history: string[]): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      return;
    }
  }
}
