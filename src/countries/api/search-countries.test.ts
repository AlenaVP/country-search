import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '../../shared/http-error.ts';
import { rawSpain, rawSwitzerland, spain } from './country-fixtures.ts';
import { SEARCH_TIMEOUT_MS, searchCountries } from './search-countries.ts';

const fetchMock = vi.fn<typeof fetch>();

const jsonResponse = (body: unknown): Response => Response.json(body);

const neverSettlesUntilAborted: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    const signal = init?.signal;

    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    signal?.addEventListener('abort', () => reject(signal.reason));
  });

describe('searchCountries', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('requests the name endpoint with the query', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await searchCountries('spain', new AbortController().signal);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://countries.dev/name/spain');
  });

  it('encodes characters that are not safe in a URL path', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await searchCountries('costa rica/?', new AbortController().signal);

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://countries.dev/name/costa%20rica%2F%3F');
  });

  it('returns the mapped countries from a successful response', async () => {
    fetchMock.mockResolvedValue(jsonResponse([rawSpain]));

    await expect(searchCountries('spain', new AbortController().signal)).resolves.toEqual([spain]);
  });

  it('keeps the order of the response', async () => {
    fetchMock.mockResolvedValue(jsonResponse([rawSwitzerland, rawSpain]));

    const countries = await searchCountries('s', new AbortController().signal);

    expect(countries.map((country) => country.name)).toEqual(['Switzerland', 'Spain']);
  });

  it('returns an empty list when the API answers 404 with a text body', async () => {
    fetchMock.mockResolvedValue(new Response('Country not found', { status: 404 }));

    await expect(searchCountries('zzz', new AbortController().signal)).resolves.toEqual([]);
  });

  it('rejects with an HttpError that keeps the status of a failed response', async () => {
    fetchMock.mockResolvedValue(new Response('Internal Server Error', { status: 500 }));

    const error: unknown = await searchCountries('spain', new AbortController().signal).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(500);
  });

  it('lets a network failure propagate unchanged', async () => {
    const failure = new TypeError('Failed to fetch');
    fetchMock.mockRejectedValue(failure);

    await expect(searchCountries('spain', new AbortController().signal)).rejects.toBe(failure);
  });

  it('cancels the request when the caller aborts the signal', async () => {
    fetchMock.mockImplementation(neverSettlesUntilAborted);
    const controller = new AbortController();

    const result = searchCountries('spain', controller.signal);
    controller.abort();

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('cancels the request when the timeout expires', async () => {
    const timedOut = AbortSignal.abort(new DOMException('The operation timed out.', 'TimeoutError'));
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timedOut);
    fetchMock.mockImplementation(neverSettlesUntilAborted);

    const result = searchCountries('spain', new AbortController().signal);

    await expect(result).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(timeoutSpy).toHaveBeenCalledWith(SEARCH_TIMEOUT_MS);
    expect(SEARCH_TIMEOUT_MS).toBe(8000);
  });
});
