import { createElement } from '../../shared/create-element.ts';
import type { SearchStateListener } from '../state/search-controller.ts';
import type { SearchState } from '../types/search-state.ts';
import { createSearchInput } from './search-input.ts';

export interface AppHandlers {
  onSearch: (query: string) => void;
}

/** Builds the static shell once and returns a function that redraws only the results region. */
export function renderApp(root: HTMLElement, handlers: AppHandlers): SearchStateListener {
  const results = createElement('section', {
    className: 'results',
    attrs: { 'aria-label': 'Search results', 'aria-live': 'polite' },
  });

  const app = createElement('div', {
    className: 'app',
    children: [
      createElement('header', {
        className: 'app__header',
        children: [createElement('h1', { className: 'app__title', text: 'Country Search' })],
      }),
      createElement('main', { className: 'app__main', children: [createSearchInput(handlers.onSearch), results] }),
    ],
  });

  const update: SearchStateListener = (state) => {
    results.replaceChildren(...renderResults(state));
  };

  root.append(app);
  update({ status: 'idle' });

  return update;
}

function renderResults(state: SearchState): Node[] {
  switch (state.status) {
    case 'idle':
      return [createElement('p', { className: 'results__hint', text: 'Start typing to see matching countries.' })];
    default:
      return [];
  }
}
