# Country Search

Live country search by name using the public [countries.dev](https://countries.dev) API.

RS School task: [Country Search](https://github.com/rolling-scopes-school/tasks/blob/master/fullstack-engineering/tasks/country-search/README.md)

The task is about a common production bug: the race of stale responses. Outdated requests are really cancelled with `AbortController`, and typing is debounced.

## Where is the code

The `main` branch stays empty on purpose. The implementation lives in the [`country-search`](https://github.com/AlenaVP/country-search/tree/country-search) branch.

- Deployment: https://alenavp.github.io/country-search/
- Design notes: `DESIGN.md` in the `country-search` branch

## Stack

TypeScript, SCSS, Vitest, ESLint, Prettier, Husky, lint-staged. No bundler: `tsc` compiles to ES modules.
