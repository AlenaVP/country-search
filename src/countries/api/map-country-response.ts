import type { Country } from '../types/country.ts';
import type { RawCountry, RawCurrency } from '../types/raw-country.ts';

export function mapCountryResponse(raw: RawCountry[]): Country[] {
  return raw.map(mapCountry);
}

function mapCountry(raw: RawCountry): Country {
  return {
    code: raw.alpha3Code || raw.name,
    name: raw.name,
    nativeName: raw.nativeName || null,
    flagUrl: raw.flags?.svg || raw.flags?.png || null,
    capital: raw.capital || null,
    region: raw.region || null,
    subregion: raw.subregion || null,
    population: raw.population ?? 0,
    area: raw.area ?? null,
    demonym: raw.demonym || null,
    borders: [...(raw.borders ?? [])],
    languages: (raw.languages ?? []).flatMap((language) => (language.name ? [language.name] : [])),
    currencies: (raw.currencies ?? []).flatMap(formatCurrency),
  };
}

function formatCurrency(currency: RawCurrency): string[] {
  const label = currency.symbol || currency.code;

  if (!currency.name) {
    return [];
  }

  return [label ? `${currency.name} (${label})` : currency.name];
}
