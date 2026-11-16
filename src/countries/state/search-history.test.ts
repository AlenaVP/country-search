import { beforeEach, describe, expect, it } from 'vitest';

import { HISTORY_LIMIT, SearchHistory, type HistoryStorage } from './search-history.ts';

describe('SearchHistory', () => {
  let saved: string | null;
  let storage: HistoryStorage;
  let history: SearchHistory;

  beforeEach(() => {
    saved = null;
    storage = {
      getItem: () => saved,
      setItem: (_key, value) => {
        saved = value;
      },
    };
    history = new SearchHistory(storage);
  });

  describe('list', () => {
    it('is empty when nothing has been saved', () => {
      expect(history.list()).toEqual([]);
    });

    it('is empty when the saved value is not valid JSON', () => {
      saved = '{broken';

      expect(history.list()).toEqual([]);
    });

    it('is empty when the saved value is not an array', () => {
      saved = '{"query":"spain"}';

      expect(history.list()).toEqual([]);
    });

    it('skips saved items that are not strings', () => {
      saved = '["spain", 42, null, "ger"]';

      expect(history.list()).toEqual(['spain', 'ger']);
    });
  });

  describe('add', () => {
    it('puts the newest query first', () => {
      history.add('spain');

      expect(history.add('ger')).toEqual(['ger', 'spain']);
    });

    it('moves a repeated query to the top instead of duplicating it', () => {
      history.add('spain');
      history.add('ger');

      expect(history.add('spain')).toEqual(['spain', 'ger']);
    });

    it('replaces the shorter beginnings of the new query left by slow typing', () => {
      history.add('fra');
      history.add('g');
      history.add('ge');

      expect(history.add('ger')).toEqual(['ger', 'fra']);
    });

    it('keeps only the latest queries up to the limit', () => {
      const queries = Array.from({ length: HISTORY_LIMIT + 2 }, (_item, index) => `query ${index}`);
      queries.forEach((query) => history.add(query));

      expect(history.list()).toEqual(queries.reverse().slice(0, HISTORY_LIMIT));
    });

    it('saves the list, so a new instance with the same storage reads it back', () => {
      history.add('spain');
      history.add('ger');

      expect(new SearchHistory(storage).list()).toEqual(['ger', 'spain']);
    });

    it('still returns the updated list when the storage refuses to write', () => {
      storage.setItem = () => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      };

      expect(history.add('spain')).toEqual(['spain']);
    });
  });
});
