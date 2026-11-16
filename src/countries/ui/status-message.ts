import { createElement } from '../../shared/create-element.ts';

export interface StatusMessageOptions {
  variant: 'empty' | 'error';
  title: string;
  text: string;
  action?: { label: string; onClick: () => void };
}

/** A panel with an icon, a title and a text. The error variant can carry an action button. */
export function createStatusMessage(options: StatusMessageOptions): HTMLElement {
  const body = createElement('div', {
    className: 'status-message__body',
    children: [
      createElement('h2', { className: 'status-message__title', text: options.title }),
      createElement('p', { className: 'status-message__text', text: options.text }),
    ],
  });

  if (options.action) {
    const button = createElement('button', {
      className: 'status-message__action',
      text: options.action.label,
      attrs: { type: 'button' },
    });

    button.addEventListener('click', options.action.onClick);
    body.append(button);
  }

  return createElement('div', {
    className: `status-message status-message--${options.variant}`,
    attrs: options.variant === 'error' ? { role: 'alert' } : {},
    children: [createElement('span', { className: 'status-message__icon', attrs: { 'aria-hidden': 'true' } }), body],
  });
}
