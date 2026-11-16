import type { SearchFn } from '../state/search-controller.ts';
import type { Country } from '../types/country.ts';

interface SharedRequest {
  promise: Promise<Country[]>;
  controller: AbortController;
  callers: number;
}

/**
 * Wraps a search function with a cache by query string and shares one in-flight request between identical calls.
 * Every caller keeps its own signal: cancelling rejects only that caller, the real request is aborted when no caller is left.
 */
export function createCachedSearch(searchFn: SearchFn): SearchFn {
  const cache = new Map<string, Country[]>();
  const inFlight = new Map<string, SharedRequest>();

  const start = (query: string): SharedRequest => {
    const controller = new AbortController();
    const request: SharedRequest = { promise: searchFn(query, controller.signal), controller, callers: 0 };

    const forget = (): void => {
      if (inFlight.get(query) === request) {
        inFlight.delete(query);
      }
    };

    inFlight.set(query, request);
    request.promise.then((countries) => {
      cache.set(query, countries);
      forget();
    }, forget);

    return request;
  };

  return async (query, signal) => {
    const cached = cache.get(query);

    if (cached) {
      return cached;
    }

    signal.throwIfAborted();

    const request = inFlight.get(query) ?? start(query);
    request.callers += 1;

    try {
      return await Promise.race([request.promise, rejectOnAbort(signal)]);
    } finally {
      request.callers -= 1;

      if (request.callers === 0 && inFlight.get(query) === request) {
        inFlight.delete(query);
        request.controller.abort();
      }
    }
  };
}

function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}
