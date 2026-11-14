import { describe, expect, it } from 'vitest';

import { HttpError } from './http-error.ts';

describe('HttpError', () => {
  it('is an Error that can be caught and checked with instanceof', () => {
    const error = new HttpError(500);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(HttpError);
  });

  it('keeps the response status', () => {
    expect(new HttpError(503).status).toBe(503);
  });

  it('has its own name and a message with the status', () => {
    const error = new HttpError(500);

    expect(error.name).toBe('HttpError');
    expect(error.message).toBe('Request failed with status 500');
  });
});
