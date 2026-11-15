import { createElement } from '../../shared/create-element.ts';

const SKELETON_CARDS = 3;
const SKELETON_LINES = 5;

/** A spinner with a text and a few grey placeholder cards, so the page keeps its height while loading. */
export function createLoadingIndicator(query: string): Node[] {
  const status = createElement('p', {
    className: 'results__status',
    children: [
      createElement('span', { className: 'spinner', attrs: { 'aria-hidden': 'true' } }),
      createElement('span', { text: `Searching for “${query}”…` }),
    ],
  });

  const skeleton = createElement('ul', {
    className: 'results__list',
    attrs: { 'aria-hidden': 'true' },
    children: Array.from({ length: SKELETON_CARDS }, createSkeletonCard),
  });

  return [status, skeleton];
}

function createSkeletonCard(): HTMLElement {
  return createElement('li', {
    className: 'skeleton-card',
    children: Array.from({ length: SKELETON_LINES }, () => createElement('span', { className: 'skeleton-card__line' })),
  });
}
