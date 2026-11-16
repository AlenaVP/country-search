import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '../../shared/http-error.ts';
import { spain } from '../api/country-fixtures.ts';
import type { SearchState } from '../types/search-state.ts';
import { SEARCH_DEBOUNCE_MS, SearchController, type SearchFn } from './search-controller.ts';

const pendingUntilAborted: SearchFn = (_query, signal) =>
  new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason));
  });

describe('SearchController', () => {
  let searchFn: ReturnType<typeof vi.fn<SearchFn>>;
  let states: SearchState[];
  let controller: SearchController;

  const lastState = (): SearchState | undefined => states.at(-1);
  const passDebounce = (): Promise<unknown> => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);

  beforeEach(() => {
    vi.useFakeTimers();
    searchFn = vi.fn<SearchFn>().mockResolvedValue([spain]);
    states = [];
    controller = new SearchController(searchFn, (state) => states.push(state));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('debounced search', () => {
    it('reports loading with the trimmed query as soon as the input changes', () => {
      controller.search('  spain ');

      expect(states).toEqual([{ status: 'loading', query: 'spain' }]);
    });

    it('does not send a request before the debounce delay has passed', async () => {
      controller.search('spain');
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 1);

      expect(searchFn).not.toHaveBeenCalled();
    });

    it('sends one request with the trimmed query and a signal after the delay', async () => {
      controller.search('  spain ');
      await passDebounce();

      expect(searchFn).toHaveBeenCalledTimes(1);
      expect(searchFn).toHaveBeenCalledWith('spain', expect.any(AbortSignal));
    });

    it('collapses fast typing into a single request for the latest query', async () => {
      controller.search('s');
      controller.search('sp');
      controller.search('spain');
      await passDebounce();

      expect(searchFn).toHaveBeenCalledTimes(1);
      expect(searchFn).toHaveBeenCalledWith('spain', expect.any(AbortSignal));
    });
  });

  describe('results', () => {
    it('reports success with the found countries', async () => {
      controller.search('spain');
      await passDebounce();

      expect(lastState()).toEqual({ status: 'success', query: 'spain', countries: [spain] });
    });

    it('reports empty when nothing was found', async () => {
      searchFn.mockResolvedValue([]);

      controller.search('zzz');
      await passDebounce();

      expect(lastState()).toEqual({ status: 'empty', query: 'zzz' });
    });
  });

  describe('errors', () => {
    it.each([
      ['http', new HttpError(500)],
      ['timeout', new DOMException('The operation timed out.', 'TimeoutError')],
      ['network', new TypeError('Failed to fetch')],
    ] as const)('reports a %s error for the query', async (kind, failure) => {
      searchFn.mockRejectedValue(failure);

      controller.search('spain');
      await passDebounce();

      expect(lastState()).toEqual({ status: 'error', query: 'spain', kind });
    });
  });

  describe('cancellation', () => {
    it('aborts the active request immediately on a new input, without waiting for the debounce', async () => {
      searchFn.mockImplementation(pendingUntilAborted);
      controller.search('sp');
      await passDebounce();
      const signal = searchFn.mock.calls[0]?.[1];

      controller.search('spain');

      expect(signal?.aborted).toBe(true);
      expect(searchFn).toHaveBeenCalledTimes(1);
    });

    it('never reports its own cancellation as an error', async () => {
      searchFn.mockImplementation(pendingUntilAborted);
      controller.search('sp');
      await passDebounce();

      controller.search('spain');
      await vi.advanceTimersByTimeAsync(0);

      expect(states.map((state) => state.status)).toEqual(['loading', 'loading']);
      expect(lastState()).toEqual({ status: 'loading', query: 'spain' });
    });

    it('uses a separate signal for every request', async () => {
      searchFn.mockImplementation(pendingUntilAborted);
      controller.search('sp');
      await passDebounce();
      controller.search('spain');
      await passDebounce();

      const [first, second] = searchFn.mock.calls.map((call) => call[1]);

      expect(first?.aborted).toBe(true);
      expect(second?.aborted).toBe(false);
    });
  });

  describe('empty input', () => {
    it.each([
      ['an empty string', ''],
      ['whitespace only', '   '],
    ])('reports idle and sends no request for %s', async (_label, input) => {
      controller.search(input);
      await passDebounce();

      expect(states).toEqual([{ status: 'idle' }]);
      expect(searchFn).not.toHaveBeenCalled();
    });

    it('aborts the active request when the input is cleared', async () => {
      searchFn.mockImplementation(pendingUntilAborted);
      controller.search('spain');
      await passDebounce();
      const signal = searchFn.mock.calls[0]?.[1];

      controller.search('');
      await vi.advanceTimersByTimeAsync(0);

      expect(signal?.aborted).toBe(true);
      expect(lastState()).toEqual({ status: 'idle' });
    });

    it('drops a request that was still waiting for the debounce when the input is cleared', async () => {
      controller.search('spain');
      controller.search('');
      await passDebounce();

      expect(searchFn).not.toHaveBeenCalled();
      expect(lastState()).toEqual({ status: 'idle' });
    });
  });

  describe('retry', () => {
    it('repeats the last entered query immediately, without the debounce', async () => {
      searchFn.mockRejectedValueOnce(new HttpError(500));
      controller.search('spain');
      await passDebounce();

      controller.retry();

      expect(searchFn).toHaveBeenCalledTimes(2);
      expect(searchFn).toHaveBeenLastCalledWith('spain', expect.any(AbortSignal));
    });

    it('reports loading and then the result of the repeated request', async () => {
      searchFn.mockRejectedValueOnce(new HttpError(500));
      controller.search('spain');
      await passDebounce();
      states.length = 0;

      controller.retry();
      await vi.advanceTimersByTimeAsync(0);

      expect(states).toEqual([
        { status: 'loading', query: 'spain' },
        { status: 'success', query: 'spain', countries: [spain] },
      ]);
    });

    it('does nothing when no query has been entered', () => {
      controller.retry();

      expect(searchFn).not.toHaveBeenCalled();
      expect(states).toEqual([]);
    });
  });

  describe('immediate search', () => {
    it('sends the request for the trimmed query at once, without the debounce', () => {
      controller.searchNow(' spain ');

      expect(searchFn).toHaveBeenCalledTimes(1);
      expect(searchFn).toHaveBeenCalledWith('spain', expect.any(AbortSignal));
    });

    it('reports loading and then the result', async () => {
      controller.searchNow('spain');
      await vi.advanceTimersByTimeAsync(0);

      expect(states).toEqual([
        { status: 'loading', query: 'spain' },
        { status: 'success', query: 'spain', countries: [spain] },
      ]);
    });

    it('aborts the active request', async () => {
      searchFn.mockImplementation(pendingUntilAborted);
      controller.search('sp');
      await passDebounce();
      const signal = searchFn.mock.calls[0]?.[1];

      controller.searchNow('spain');

      expect(signal?.aborted).toBe(true);
    });

    it('drops a debounced search for another text that was still waiting', async () => {
      controller.search('sp');
      controller.searchNow('spain');
      await passDebounce();

      expect(searchFn).toHaveBeenCalledTimes(1);
      expect(searchFn).toHaveBeenCalledWith('spain', expect.any(AbortSignal));
    });

    it('keeps a single live request when a debounced search for the same text fires later', async () => {
      searchFn.mockImplementation(pendingUntilAborted);
      controller.search('spain');
      controller.searchNow('spain');
      await passDebounce();
      const [first, second] = searchFn.mock.calls.map((call) => call[1]);

      expect(first?.aborted).toBe(true);
      expect(second?.aborted).toBe(false);
    });

    it('makes retry repeat the query that was searched immediately', async () => {
      searchFn.mockRejectedValueOnce(new HttpError(500));
      controller.searchNow('spain');
      await vi.advanceTimersByTimeAsync(0);

      controller.retry();

      expect(searchFn).toHaveBeenCalledTimes(2);
      expect(searchFn).toHaveBeenLastCalledWith('spain', expect.any(AbortSignal));
    });
  });
});
