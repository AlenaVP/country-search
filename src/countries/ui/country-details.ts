import { createElement } from '../../shared/create-element.ts';
import type { Country } from '../types/country.ts';

const TITLE_ID = 'country-details-title';
const MISSING_VALUE = '—';

export interface CountryDetails {
  element: HTMLDialogElement;
  open: (country: Country) => void;
}

/** One dialog for the whole app: created once, filled with a country every time it opens. */
export function createCountryDetails(): CountryDetails {
  const dialog = createElement('dialog', { className: 'country-details', attrs: { 'aria-labelledby': TITLE_ID } });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  const open = (country: Country): void => {
    dialog.replaceChildren(createContent(country, () => dialog.close()));
    dialog.showModal();
  };

  return { element: dialog, open };
}

function createContent(country: Country, onClose: () => void): HTMLElement {
  const closeButton = createElement('button', {
    className: 'country-details__close',
    attrs: { type: 'button', 'aria-label': 'Close' },
  });

  closeButton.addEventListener('click', onClose);

  return createElement('div', {
    className: 'country-details__content',
    children: [
      createElement('div', { className: 'country-details__top', children: [createFlag(country), closeButton] }),
      createHeading(country),
      createElement('p', { className: 'country-details__description', text: describeCountry(country) }),
      createElement('dl', {
        className: 'country-details__facts',
        children: [
          createFact('Area', country.area === null ? MISSING_VALUE : `${country.area.toLocaleString()} km²`),
          createFact('Languages', country.languages.join(', ') || MISSING_VALUE),
          createFact('Currencies', country.currencies.join(', ') || MISSING_VALUE),
          createFact('Borders', country.borders.join(', ') || 'None'),
        ],
      }),
    ],
  });
}

function createHeading(country: Country): HTMLElement {
  const heading = createElement('div', {
    className: 'country-details__heading',
    children: [createElement('h2', { className: 'country-details__title', text: country.name, attrs: { id: TITLE_ID } })],
  });

  if (country.code !== country.name) {
    heading.append(createElement('span', { className: 'country-details__code', text: country.code }));
  }

  return heading;
}

function createFlag(country: Country): HTMLElement {
  if (country.flagUrl === null) {
    return createElement('span', { className: 'country-details__flag country-details__flag--missing' });
  }

  return createElement('img', {
    className: 'country-details__flag',
    attrs: { src: country.flagUrl, alt: `Flag of ${country.name}` },
  });
}

function createFact(label: string, value: string): HTMLElement {
  return createElement('div', {
    className: 'country-details__fact',
    children: [
      createElement('dt', { className: 'country-details__label', text: label }),
      createElement('dd', { className: 'country-details__value', text: value }),
    ],
  });
}

/** The API has no description field, so the text is composed from the fields it does have. */
function describeCountry(country: Country): string {
  const hasNativeName = country.nativeName !== null && country.nativeName !== country.name;
  const title = hasNativeName ? `${country.name} (${country.nativeName})` : country.name;
  const place = country.subregion ?? country.region;
  const sentences: string[] = [];

  if (place !== null) {
    sentences.push(`${title} is located in ${place}.`);
  }

  if (country.demonym !== null) {
    sentences.push(`People from ${country.name} are called ${country.demonym}.`);
  }

  return sentences.join(' ') || 'No description available.';
}
