/** Country data prepared for the UI: no optional fields, missing values are explicit. */
export interface Country {
  code: string;
  name: string;
  nativeName: string | null;
  flagUrl: string | null;
  capital: string | null;
  region: string | null;
  subregion: string | null;
  population: number;
  area: number | null;
  demonym: string | null;
  borders: string[];
  languages: string[];
  currencies: string[];
}
