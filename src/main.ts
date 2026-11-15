import { searchCountries } from './countries/api/search-countries.ts';
import { SearchController } from './countries/state/search-controller.ts';
import { renderApp } from './countries/ui/render-app.ts';

const update = renderApp(document.body, {
  onSearch: (query) => {
    controller.search(query);
  },
});

const controller = new SearchController(searchCountries, update);
