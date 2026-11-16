import { describe, expect, it } from 'vitest';

import type { RawCountry } from '../types/raw-country.ts';
import { rawMinimal, rawSpain, rawSwitzerland, spain } from './country-fixtures.ts';
import { mapCountryResponse } from './map-country-response.ts';

const mapOne = (raw: RawCountry) => mapCountryResponse([raw])[0];

describe('mapCountryResponse', () => {
  it('returns an empty list for an empty response', () => {
    expect(mapCountryResponse([])).toEqual([]);
  });

  it('maps a complete API record to country data', () => {
    expect(mapCountryResponse([rawSpain])).toEqual([spain]);
  });

  it('maps every record and keeps the order of the response', () => {
    const countries = mapCountryResponse([rawSwitzerland, rawSpain]);

    expect(countries.map((country) => country.name)).toEqual(['Switzerland', 'Spain']);
  });

  it('collects the names of all languages', () => {
    expect(mapOne(rawSwitzerland)?.languages).toEqual(['German', 'French', 'Italian', 'Romansh']);
  });

  it('skips languages that have no name', () => {
    const raw: RawCountry = { ...rawSpain, languages: [{ name: 'Spanish' }, { nativeName: 'Català' }] };

    expect(mapOne(raw)?.languages).toEqual(['Spanish']);
  });

  it('formats a currency as its name followed by the symbol', () => {
    expect(mapOne(rawSwitzerland)?.currencies).toEqual(['Swiss franc (Fr)']);
  });

  it('falls back to the currency code when the symbol is missing', () => {
    const raw: RawCountry = { ...rawSpain, currencies: [{ code: 'EUR', name: 'Euro' }] };

    expect(mapOne(raw)?.currencies).toEqual(['Euro (EUR)']);
  });

  it('prefers the SVG flag and falls back to PNG', () => {
    const raw: RawCountry = { ...rawSpain, flags: { png: 'https://flagcdn.com/w320/es.png' } };

    expect(mapOne(rawSpain)?.flagUrl).toBe('https://flagcdn.com/es.svg');
    expect(mapOne(raw)?.flagUrl).toBe('https://flagcdn.com/w320/es.png');
  });

  it('replaces missing optional fields with explicit empty values', () => {
    expect(mapOne(rawMinimal)).toEqual({
      code: 'Antarctica',
      name: 'Antarctica',
      nativeName: null,
      flagUrl: null,
      capital: null,
      region: null,
      subregion: null,
      population: 0,
      area: null,
      demonym: null,
      borders: [],
      languages: [],
      currencies: [],
    });
  });

  it('treats an empty capital as missing', () => {
    expect(mapOne({ ...rawSpain, capital: '' })?.capital).toBeNull();
  });

  it('does not mutate the response', () => {
    const response = [structuredClone(rawSpain)];
    const snapshot = structuredClone(response);

    mapCountryResponse(response);

    expect(response).toEqual(snapshot);
  });

  it('returns a copy of the borders list, not the original array', () => {
    expect(mapOne(rawSpain)?.borders).not.toBe(rawSpain.borders);
  });
});
