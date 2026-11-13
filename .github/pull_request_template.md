1. Task: [Country Search](https://github.com/rolling-scopes-school/tasks/blob/master/fullstack-engineering/tasks/country-search/README.md)
2. Screenshot: _drag-and-drop screenshot here_

3. Deployment: https://alenavp.github.io/country-search/
4. Done DD.11.2026 / deadline 16.11.2026
5. Score: \_\_ / 145 (+ \_\_ / 10 bonus)
6. Design document: [DESIGN.md](https://github.com/AlenaVP/country-search/blob/country-search/DESIGN.md)

## Commit order (tests → implementation)

| Function / logic                                         | Tests commit | Implementation commit |
| -------------------------------------------------------- | ------------ | --------------------- |
| `debounce`                                               |              |                       |
| `mapCountryResponse`                                     |              |                       |
| Error classification (Abort / Timeout / HttpError / 404) |              |                       |
| `searchCountries`                                        |              |                       |
| Stale response race test (separate commit)               |              | —                     |

## Behaviour checklist (checked manually on the deployment)

- [ ] Empty input: no requests, empty list
- [ ] Loading indicator is visible while a request is in flight
- [ ] Fast typing never shows results of a stale request
- [ ] Cancelled requests are marked `canceled` in the Network tab
- [ ] Cancelling my own request is not shown as an error
- [ ] No matches (404) shows a friendly "nothing found" message, not an error
- [ ] A real error shows a message with a "Retry" button that repeats the last query
- [ ] Clicking a card opens the detail view

## Self-assessment

### Project setup (15)

- [ ] (5) TypeScript is configured and used across the project
- [ ] (5) ESLint + Prettier are configured, `lint` / `format` scripts work
- [ ] (3) Husky pre-commit runs only `lint-staged`
- [ ] (2) Husky pre-push runs `npm test` and blocks red tests

### TDD and tests (30)

- [ ] (5) `debounce`: tests before implementation
- [ ] (5) `searchCountries`: tests before implementation
- [ ] (5) `mapCountryResponse`: tests before implementation
- [ ] (5) Error classification: tests before implementation
- [ ] (10) Separate race test with a signal-aware `fetch` mock

### Async architecture (55)

- [ ] (10) Own `debounce` that resets the timer correctly
- [ ] (15) Previous request is aborted with `AbortController` on every input change
- [ ] (10) `AbortError` is not shown to the user
- [ ] (10) 404 is handled separately and is not shown as an error
- [ ] (5) `response.ok` is checked, `HttpError` is thrown for other statuses
- [ ] (5) Timeout via `AbortSignal.timeout`, `TimeoutError` is distinguished from `AbortError`

### DESIGN.md (20)

- [ ] (10) Cancellation mechanism and debounce delay are justified
- [ ] (5) Big O for `mapCountryResponse`
- [ ] (5) Clean code principles with exact locations

### UI and behaviour (25)

- [ ] (10) Loading / empty / error / results states are visually distinct
- [ ] (5) "Retry" repeats exactly the last query
- [ ] (5) Detail view on card click
- [ ] (5) Fast typing does not show stale results

### Bonus (10)

- [ ] (6) Response cache + in-flight request deduplication
- [ ] (4) Search history in localStorage
