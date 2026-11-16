import type { Country } from '../types/country.ts';
import type { RawCountry } from '../types/raw-country.ts';

export const rawSpain: RawCountry = {
  name: 'Spain',
  alpha3Code: 'ESP',
  nativeName: 'España',
  capital: 'Madrid',
  region: 'Europe',
  subregion: 'Southern Europe',
  population: 47351567,
  area: 505992,
  demonym: 'Spanish',
  borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
  flags: {
    svg: 'https://flagcdn.com/es.svg',
    png: 'https://flagcdn.com/w320/es.png',
  },
  languages: [{ name: 'Spanish', nativeName: 'Español' }],
  currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
};

export const spain: Country = {
  code: 'ESP',
  name: 'Spain',
  nativeName: 'España',
  flagUrl: 'https://flagcdn.com/es.svg',
  capital: 'Madrid',
  region: 'Europe',
  subregion: 'Southern Europe',
  population: 47351567,
  area: 505992,
  demonym: 'Spanish',
  borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
  languages: ['Spanish'],
  currencies: ['Euro (€)'],
};

export const rawSwitzerland: RawCountry = {
  name: 'Switzerland',
  alpha3Code: 'CHE',
  nativeName: 'Schweiz',
  capital: 'Bern',
  region: 'Europe',
  subregion: 'Western Europe',
  population: 8654622,
  area: 41284,
  demonym: 'Swiss',
  borders: ['AUT', 'FRA', 'ITA', 'LIE', 'DEU'],
  flags: {
    svg: 'https://flagcdn.com/ch.svg',
    png: 'https://flagcdn.com/w320/ch.png',
  },
  languages: [{ name: 'German' }, { name: 'French' }, { name: 'Italian' }, { name: 'Romansh' }],
  currencies: [{ code: 'CHF', name: 'Swiss franc', symbol: 'Fr' }],
};

/** A record with only the required field: checks how missing data is handled. */
export const rawMinimal: RawCountry = {
  name: 'Antarctica',
};
