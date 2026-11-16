export interface ElementOptions {
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
  children?: Node[];
}

/** Builds a DOM element without innerHTML: text goes through textContent, so it is never parsed as markup. */
export function createElement<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  options: ElementOptions = {},
): HTMLElementTagNameMap[Tag] {
  const element = document.createElement(tag);

  if (options.className) {
    element.className = options.className;
  }

  if (options.text !== undefined) {
    element.textContent = options.text;
  }

  for (const [name, value] of Object.entries(options.attrs ?? {})) {
    element.setAttribute(name, value);
  }

  element.append(...(options.children ?? []));

  return element;
}
