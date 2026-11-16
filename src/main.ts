import { createCachedSearch } from './countries/api/cached-search.ts';
import { searchCountries } from './countries/api/search-countries.ts';
import { SearchController } from './countries/state/search-controller.ts';
import { SearchHistory } from './countries/state/search-history.ts';
import { renderApp } from './countries/ui/render-app.ts';

const history = new SearchHistory(localStorage);

const view = renderApp(document.body, {
  onSearch: (query) => {
    controller.search(query);
  },
  onRetry: () => {
    controller.retry();
  },
  onHistorySelect: (query) => {
    controller.searchNow(query);
  },
});

const controller = new SearchController(createCachedSearch(searchCountries), (state) => {
  view.showState(state);

  if (state.status === 'success') {
    view.showHistory(history.add(state.query));
  }
});

view.showHistory(history.list());
