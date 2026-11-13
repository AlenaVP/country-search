/** Shape of a country as returned by the countries.dev API. Only the fields we use. */
export interface RawCountry {
  name: string;
  alpha3Code?: string;
  nativeName?: string;
  capital?: string;
  region?: string;
  subregion?: string;
  population?: number;
  area?: number;
  demonym?: string;
  borders?: string[];
  flags?: RawFlags;
  languages?: RawLanguage[];
  currencies?: RawCurrency[];
}

export interface RawFlags {
  svg?: string;
  png?: string;
}

export interface RawLanguage {
  name?: string;
  nativeName?: string;
}

export interface RawCurrency {
  code?: string;
  name?: string;
  symbol?: string;
}
