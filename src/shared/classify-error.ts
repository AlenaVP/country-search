import { HttpError } from './http-error.ts';

export type ErrorKind = 'aborted' | 'timeout' | 'http' | 'network';

export function classifyError(error: unknown): ErrorKind {
  if (error instanceof HttpError) {
    return 'http';
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'aborted';
  }

  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return 'timeout';
  }

  return 'network';
}
