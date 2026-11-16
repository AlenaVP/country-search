import { HttpError } from '../../shared/http-error.ts';
import type { Country } from '../types/country.ts';
import type { RawCountry } from '../types/raw-country.ts';
import { mapCountryResponse } from './map-country-response.ts';

export const SEARCH_TIMEOUT_MS = 8000;

const API_URL = 'https://countries.dev/name';
const NOT_FOUND = 404;

export async function searchCountries(query: string, signal: AbortSignal): Promise<Country[]> {
  const url = `${API_URL}/${encodeURIComponent(query)}`;
  const timeoutSignal = AbortSignal.timeout(SEARCH_TIMEOUT_MS);
  const response = await fetch(url, { signal: AbortSignal.any([signal, timeoutSignal]) });

  if (response.status === NOT_FOUND) {
    return [];
  }

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  const raw = (await response.json()) as RawCountry[];

  return mapCountryResponse(raw);
}
