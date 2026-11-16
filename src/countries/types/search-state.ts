import type { ErrorKind } from '../../shared/classify-error.ts';
import type { Country } from './country.ts';

export type SearchErrorKind = Exclude<ErrorKind, 'aborted'>;

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'success'; query: string; countries: Country[] }
  | { status: 'empty'; query: string }
  | { status: 'error'; query: string; kind: SearchErrorKind };
