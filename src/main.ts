import { createCachedSearch } from './countries/api/cached-search.ts';
import { searchCountries } from './countries/api/search-countries.ts';
import { SearchController } from './countries/state/search-controller.ts';
import { renderApp } from './countries/ui/render-app.ts';

const update = renderApp(document.body, {
  onSearch: (query) => {
    controller.search(query);
  },
  onRetry: () => {
    controller.retry();
  },
});

const controller = new SearchController(createCachedSearch(searchCountries), update);
