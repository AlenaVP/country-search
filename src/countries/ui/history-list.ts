import { createElement } from '../../shared/create-element.ts';

export interface HistoryList {
  element: HTMLElement;
  show: (queries: string[]) => void;
}

export function createHistoryList(onSelect: (query: string) => void): HistoryList {
  const element = createElement('section', { className: 'history', attrs: { 'aria-label': 'Recent searches' } });

  const createItem = (query: string): HTMLElement => {
    const button = createElement('button', { className: 'history__button', text: query, attrs: { type: 'button' } });

    button.addEventListener('click', () => {
      onSelect(query);
    });

    return createElement('li', { children: [button] });
  };

  const show = (queries: string[]): void => {
    if (queries.length === 0) {
      element.replaceChildren();
      return;
    }

    element.replaceChildren(
      createElement('p', { className: 'history__title', text: 'Recent searches' }),
      createElement('ul', { className: 'history__list', children: queries.map(createItem) }),
    );
  };

  return { element, show };
}
