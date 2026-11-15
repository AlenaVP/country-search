import { createElement } from '../../shared/create-element.ts';
import type { Country } from '../types/country.ts';

const MISSING_VALUE = '—';

export function createCountryCard(country: Country, onSelect: (country: Country) => void): HTMLElement {
  const code = country.code === country.name ? '' : country.code;

  const card = createElement('button', {
    className: 'country-card',
    attrs: { type: 'button' },
    children: [
      createElement('span', {
        className: 'country-card__top',
        children: [createFlag(country.flagUrl), createElement('span', { className: 'country-card__code', text: code })],
      }),
      createElement('span', { className: 'country-card__name', text: country.name }),
      createElement('span', {
        className: 'country-card__facts',
        children: [
          createFact('Capital', country.capital ?? MISSING_VALUE),
          createFact('Region', country.region ?? MISSING_VALUE),
          createFact('Population', country.population.toLocaleString()),
        ],
      }),
    ],
  });

  card.addEventListener('click', () => {
    onSelect(country);
  });

  return createElement('li', { className: 'results__item', children: [card] });
}

function createFlag(flagUrl: string | null): HTMLElement {
  if (flagUrl === null) {
    return createElement('span', { className: 'country-card__flag country-card__flag--missing' });
  }

  return createElement('img', { className: 'country-card__flag', attrs: { src: flagUrl, alt: '' } });
}

function createFact(label: string, value: string): HTMLElement {
  return createElement('span', {
    className: 'country-card__fact',
    children: [
      createElement('span', { className: 'country-card__label', text: label }),
      createElement('span', { className: 'country-card__value', text: value }),
    ],
  });
}
