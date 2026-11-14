import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { rawSpain, rawSwitzerland, spain } from '../api/country-fixtures.ts';
import { searchCountries } from '../api/search-countries.ts';
import type { SearchState } from '../types/search-state.ts';
import { SEARCH_DEBOUNCE_MS, SearchController } from './search-controller.ts';

interface PendingRequest {
  url: string;
  signal: AbortSignal;
  respond: (body: unknown) => void;
}

describe('stale response race', () => {
  let requests: PendingRequest[];
  let states: SearchState[];
  let controller: SearchController;

  const abortableFetch: typeof fetch = (input, init) =>
    new Promise((resolve, reject) => {
      const signal = init?.signal;

      if (!signal) {
        reject(new Error('fetch was called without a signal'));
        return;
      }

      signal.addEventListener('abort', () => reject(signal.reason));
      requests.push({ url: String(input), signal, respond: (body) => resolve(Response.json(body)) });
    });

  const passDebounce = (): Promise<unknown> => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
  const settle = (): Promise<unknown> => vi.advanceTimersByTimeAsync(0);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(abortableFetch));
    requests = [];
    states = [];
    controller = new SearchController(searchCountries, (state) => states.push(state));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('shows only the result of the last query when the earlier response arrives later', async () => {
    controller.search('sp');
    await passDebounce();
    controller.search('spain');
    await passDebounce();
    const [earlier, later] = requests;

    later?.respond([rawSpain]);
    await settle();
    earlier?.respond([rawSwitzerland]);
    await settle();

    expect(requests.map((request) => request.url)).toEqual([
      'https://countries.dev/name/sp',
      'https://countries.dev/name/spain',
    ]);
    expect(states.at(-1)).toEqual({ status: 'success', query: 'spain', countries: [spain] });
  });

  it('really aborts the earlier request instead of ignoring its response', async () => {
    controller.search('sp');
    await passDebounce();
    controller.search('spain');
    await passDebounce();
    const [earlier, later] = requests;

    expect(earlier?.signal.aborted).toBe(true);
    expect(earlier?.signal.reason).toMatchObject({ name: 'AbortError' });
    expect(later?.signal.aborted).toBe(false);
  });

  it('never reports the stale result or an error while the queries race', async () => {
    controller.search('sp');
    await passDebounce();
    controller.search('spain');
    await passDebounce();
    const [earlier, later] = requests;

    later?.respond([rawSpain]);
    await settle();
    earlier?.respond([rawSwitzerland]);
    await settle();

    expect(states).toEqual([
      { status: 'loading', query: 'sp' },
      { status: 'loading', query: 'spain' },
      { status: 'success', query: 'spain', countries: [spain] },
    ]);
  });
});
