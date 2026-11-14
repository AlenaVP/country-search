import { classifyError } from '../../shared/classify-error.ts';
import { debounce } from '../../shared/debounce.ts';
import type { Country } from '../types/country.ts';
import type { SearchState } from '../types/search-state.ts';

export const SEARCH_DEBOUNCE_MS = 300;

export type SearchFn = (query: string, signal: AbortSignal) => Promise<Country[]>;
export type SearchStateListener = (state: SearchState) => void;

export class SearchController {
  private query = '';
  private abortController: AbortController | null = null;
  private readonly runDebounced: (query: string) => void;

  constructor(
    private readonly searchFn: SearchFn,
    private readonly onChange: SearchStateListener,
  ) {
    this.runDebounced = debounce((query: string) => {
      void this.run(query);
    }, SEARCH_DEBOUNCE_MS);
  }

  search(input: string): void {
    this.abortController?.abort();
    this.query = input.trim();

    if (this.query === '') {
      this.onChange({ status: 'idle' });
      return;
    }

    this.onChange({ status: 'loading', query: this.query });
    this.runDebounced(this.query);
  }

  retry(): void {
    if (this.query === '') {
      return;
    }

    this.abortController?.abort();
    this.onChange({ status: 'loading', query: this.query });
    void this.run(this.query);
  }

  private async run(query: string): Promise<void> {
    if (query !== this.query) {
      return;
    }

    const abortController = new AbortController();
    this.abortController = abortController;

    try {
      const countries = await this.searchFn(query, abortController.signal);

      this.onChange(countries.length > 0 ? { status: 'success', query, countries } : { status: 'empty', query });
    } catch (error) {
      const kind = classifyError(error);

      if (kind !== 'aborted') {
        this.onChange({ status: 'error', query, kind });
      }
    }
  }
}
