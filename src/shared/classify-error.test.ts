import { describe, expect, it } from 'vitest';

import { classifyError } from './classify-error.ts';
import { HttpError } from './http-error.ts';

describe('classifyError', () => {
  it('classifies an AbortError as aborted', () => {
    const error = new DOMException('The operation was aborted.', 'AbortError');

    expect(classifyError(error)).toBe('aborted');
  });

  it('classifies the reason of an aborted controller signal as aborted', () => {
    const controller = new AbortController();

    controller.abort();

    expect(classifyError(controller.signal.reason)).toBe('aborted');
  });

  it('classifies a TimeoutError as timeout', () => {
    const error = new DOMException('The operation timed out.', 'TimeoutError');

    expect(classifyError(error)).toBe('timeout');
  });

  it('classifies an HttpError as http', () => {
    expect(classifyError(new HttpError(500))).toBe('http');
  });

  it('classifies a fetch TypeError as network', () => {
    expect(classifyError(new TypeError('Failed to fetch'))).toBe('network');
  });

  it('classifies an unrelated DOMException as network', () => {
    const error = new DOMException('Unexpected failure.', 'InvalidStateError');

    expect(classifyError(error)).toBe('network');
  });

  it.each([
    ['a string', 'boom'],
    ['undefined', undefined],
    ['null', null],
    ['a plain object', { status: 500 }],
  ])('classifies %s as network', (_label, value) => {
    expect(classifyError(value)).toBe('network');
  });
});
