import { createElement } from '../../shared/create-element.ts';
import type { SearchStateListener } from '../state/search-controller.ts';
import type { Country } from '../types/country.ts';
import type { SearchState } from '../types/search-state.ts';
import { createCountryCard } from './country-card.ts';
import { createCountryDetails } from './country-details.ts';
import { ERROR_MESSAGES } from './error-messages.ts';
import { createLoadingIndicator } from './loading-indicator.ts';
import { createSearchInput } from './search-input.ts';
import { createStatusMessage } from './status-message.ts';

export interface AppHandlers {
  onSearch: (query: string) => void;
  onRetry: () => void;
}

interface ResultsHandlers {
  onRetry: () => void;
  onSelect: (country: Country) => void;
}

/** Builds the static shell once and returns a function that redraws only the results region. */
export function renderApp(root: HTMLElement, handlers: AppHandlers): SearchStateListener {
  const results = createElement('section', {
    className: 'results',
    attrs: { 'aria-label': 'Search results', 'aria-live': 'polite' },
  });

  const details = createCountryDetails();
  const resultsHandlers: ResultsHandlers = { onRetry: handlers.onRetry, onSelect: details.open };

  const app = createElement('div', {
    className: 'app',
    children: [
      createElement('header', {
        className: 'app__header',
        children: [createElement('h1', { className: 'app__title', text: 'Country Search' })],
      }),
      createElement('main', { className: 'app__main', children: [createSearchInput(handlers.onSearch), results] }),
      details.element,
    ],
  });

  const update: SearchStateListener = (state) => {
    results.replaceChildren(...renderResults(state, resultsHandlers));
  };

  root.append(app);
  update({ status: 'idle' });

  return update;
}

function renderResults(state: SearchState, handlers: ResultsHandlers): Node[] {
  switch (state.status) {
    case 'idle':
      return [createElement('p', { className: 'results__hint', text: 'Start typing to see matching countries.' })];
    case 'loading':
      return createLoadingIndicator(state.query);
    case 'success':
      return [
        createElement('p', { className: 'results__status', text: formatCount(state.countries.length, state.query) }),
        createElement('ul', {
          className: 'results__list',
          children: state.countries.map((country) => createCountryCard(country, handlers.onSelect)),
        }),
      ];
    case 'empty':
      return [
        createStatusMessage({
          variant: 'empty',
          title: `No countries match “${state.query}”`,
          text: 'Check the spelling or try a shorter name.',
        }),
      ];
    case 'error':
      return [
        createStatusMessage({
          variant: 'error',
          title: 'Could not load countries',
          text: ERROR_MESSAGES[state.kind],
          action: { label: 'Retry', onClick: handlers.onRetry },
        }),
      ];
  }
}

function formatCount(count: number, query: string): string {
  const noun = count === 1 ? 'country' : 'countries';

  return `${count} ${noun} found for “${query}”`;
}
