import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '../../shared/http-error.ts';
import type { SearchFn } from '../state/search-controller.ts';
import type { Country } from '../types/country.ts';
import { createCachedSearch } from './cached-search.ts';
import { spain } from './country-fixtures.ts';

interface PendingSearch {
  signal: AbortSignal;
  resolve: (countries: Country[]) => void;
  reject: (error: unknown) => void;
}

describe('createCachedSearch', () => {
  let pending: PendingSearch[];
  let searchFn: ReturnType<typeof vi.fn<SearchFn>>;
  let cachedSearch: SearchFn;

  const abortableSearch: SearchFn = (_query, signal) =>
    new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason));
      pending.push({ signal, resolve, reject });
    });

  const freshSignal = (): AbortSignal => new AbortController().signal;

  beforeEach(() => {
    pending = [];
    searchFn = vi.fn(abortableSearch);
    cachedSearch = createCachedSearch(searchFn);
  });

  describe('cache', () => {
    it('passes the query to the wrapped function and returns its result', async () => {
      const result = cachedSearch('spain', freshSignal());
      pending[0]?.resolve([spain]);

      await expect(result).resolves.toEqual([spain]);
      expect(searchFn).toHaveBeenCalledWith('spain', expect.any(AbortSignal));
    });

    it('answers a repeated query from the cache without a second request', async () => {
      const first = cachedSearch('spain', freshSignal());
      pending[0]?.resolve([spain]);
      await first;

      await expect(cachedSearch('spain', freshSignal())).resolves.toEqual([spain]);
      expect(searchFn).toHaveBeenCalledTimes(1);
    });

    it('caches an empty result as well', async () => {
      const first = cachedSearch('zzz', freshSignal());
      pending[0]?.resolve([]);
      await first;

      await expect(cachedSearch('zzz', freshSignal())).resolves.toEqual([]);
      expect(searchFn).toHaveBeenCalledTimes(1);
    });

    it('sends a separate request for a different query', async () => {
      const first = cachedSearch('spain', freshSignal());
      pending[0]?.resolve([spain]);
      await first;

      void cachedSearch('sp', freshSignal());

      expect(searchFn).toHaveBeenCalledTimes(2);
      expect(searchFn).toHaveBeenLastCalledWith('sp', expect.any(AbortSignal));
    });

    it('does not cache a failed request', async () => {
      const failed = cachedSearch('spain', freshSignal());
      pending[0]?.reject(new HttpError(500));
      await expect(failed).rejects.toBeInstanceOf(HttpError);

      const repeated = cachedSearch('spain', freshSignal());
      pending[1]?.resolve([spain]);

      await expect(repeated).resolves.toEqual([spain]);
      expect(searchFn).toHaveBeenCalledTimes(2);
    });

    it('does not cache a cancelled request', async () => {
      const caller = new AbortController();
      const cancelled = cachedSearch('spain', caller.signal);
      caller.abort();
      await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });

      const repeated = cachedSearch('spain', freshSignal());
      pending[1]?.resolve([spain]);

      await expect(repeated).resolves.toEqual([spain]);
      expect(searchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('in-flight deduplication', () => {
    it('shares one request between identical simultaneous calls', async () => {
      const first = cachedSearch('spain', freshSignal());
      const second = cachedSearch('spain', freshSignal());
      pending[0]?.resolve([spain]);

      await expect(first).resolves.toEqual([spain]);
      await expect(second).resolves.toEqual([spain]);
      expect(searchFn).toHaveBeenCalledTimes(1);
    });

    it('delivers a failure of the shared request to every caller', async () => {
      const first = cachedSearch('spain', freshSignal());
      const second = cachedSearch('spain', freshSignal());
      pending[0]?.reject(new HttpError(500));

      await expect(first).rejects.toBeInstanceOf(HttpError);
      await expect(second).rejects.toBeInstanceOf(HttpError);
    });

    it('rejects only the caller that cancelled and keeps the shared request alive for the others', async () => {
      const impatient = new AbortController();
      const cancelled = cachedSearch('spain', impatient.signal);
      const patient = cachedSearch('spain', freshSignal());

      impatient.abort();
      await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });

      expect(pending[0]?.signal.aborted).toBe(false);
      pending[0]?.resolve([spain]);
      await expect(patient).resolves.toEqual([spain]);
    });

    it('aborts the real request when its only caller cancels', async () => {
      const caller = new AbortController();
      const cancelled = cachedSearch('spain', caller.signal);

      caller.abort();
      await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });

      expect(pending[0]?.signal.aborted).toBe(true);
    });

    it('aborts the real request when every caller has cancelled', async () => {
      const first = new AbortController();
      const second = new AbortController();
      const results = [cachedSearch('spain', first.signal), cachedSearch('spain', second.signal)];

      first.abort();
      second.abort();
      await Promise.allSettled(results);

      expect(pending[0]?.signal.aborted).toBe(true);
    });

    it('does not send a request for a signal that is already aborted', async () => {
      const caller = new AbortController();
      caller.abort();

      await expect(cachedSearch('spain', caller.signal)).rejects.toMatchObject({ name: 'AbortError' });
      expect(searchFn).not.toHaveBeenCalled();
    });
  });
});
