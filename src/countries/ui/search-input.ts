import { createElement } from '../../shared/create-element.ts';

const INPUT_ID = 'country-query';

export interface SearchInput {
  element: HTMLElement;
  setValue: (query: string) => void;
}

export function createSearchInput(onSearch: (query: string) => void): SearchInput {
  const input = createElement('input', {
    className: 'search__input',
    attrs: { id: INPUT_ID, type: 'search', placeholder: 'e.g. Germany', autocomplete: 'off' },
  });

  input.addEventListener('input', () => {
    onSearch(input.value);
  });

  const element = createElement('div', {
    className: 'search',
    children: [
      createElement('label', { className: 'search__label', text: 'Search by country name', attrs: { for: INPUT_ID } }),
      createElement('div', { className: 'search__field', children: [input] }),
    ],
  });

  const setValue = (query: string): void => {
    input.value = query;
  };

  return { element, setValue };
}
