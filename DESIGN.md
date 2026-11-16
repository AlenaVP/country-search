# Design notes

Country Search is a live search over `GET https://countries.dev/name/{query}`. This document explains the decisions behind the asynchronous part and the code structure.

## 1. Cancelling stale requests

### How it works

All of it lives in `SearchController` (`src/countries/state/search-controller.ts`).

1. Every `input` event calls `search(input)`.
2. The first line of `search` is `this.abortController?.abort()`. The request that is in flight is cancelled immediately, before the debounce timer is even restarted.
3. Empty input reports `idle` and stops: no request is sent.
4. Otherwise the controller reports `loading` and schedules `run(query)` through `debounce`.
5. `run` creates a new `AbortController` for this one request and passes its `signal` to `searchCountries`, which passes it to `fetch`.
6. An aborted `fetch` rejects with `AbortError`. `classifyError` returns `'aborted'` for it, and the controller ignores this kind: the user never sees their own cancellation as an error.

The timeout is a second, independent reason to stop a request. `searchCountries` merges both signals with `AbortSignal.any([signal, AbortSignal.timeout(SEARCH_TIMEOUT_MS)])`. The two cases are told apart by the error name: `AbortError` is silent, `TimeoutError` becomes an error with a Retry button.

### Why the abort is outside the debounce

If `abort()` were called only when the debounced function fires, there would be a 300 ms window after each keystroke in which the response for the previous text could still arrive and be drawn under the new text. Aborting on every input change closes this window.

### Why not a "is this response still current" flag

A flag (or a timestamp, or a request counter) only hides the result. The request itself stays alive.

|                          | Flag / timestamp                                                                    | `AbortController`                                          |
| ------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Network                  | The stale response is fully downloaded                                              | The connection is closed                                   |
| Work after the response  | JSON is parsed and mapped, then thrown away                                         | Nothing runs                                               |
| Connection limit         | Stale requests keep occupying connections to the host and can delay the current one | Connections are released at once                           |
| Errors of stale requests | Need the same check in the error branch, easy to forget                             | They arrive as `AbortError`, which is handled in one place |
| Where the rule lives     | In every place that handles a response                                              | In one line of `search`                                    |

The race test (`src/countries/state/search-race.test.ts`) proves the cancellation is real: its `fetch` mock answers the later request first and rejects with `AbortError` only when the signal is aborted. Removing `this.abortController?.abort()` from `search` makes all three tests in this file fail.

One check in `run` may look like such a flag: `if (query !== this.query) return`. It is not one. It runs before a request is sent and only drops a debounce timer that outlived its query (for example, the user typed and then cleared the field). It never decides what to do with a response.

### Timeout: 8 seconds

`SEARCH_TIMEOUT_MS = 8000`. A normal response from this API takes well under a second, so 8 seconds leaves room for a slow mobile network, yet the user is not left with an endless spinner: they get a message and a Retry button.

## 2. Debounce delay: 300 ms

`SEARCH_DEBOUNCE_MS = 300`. The pause between keystrokes while a person types a word is usually shorter than 300 ms, and a pause after the last letter is longer. So the request is sent when the user stops, not while they type.

| Delay            | What happens                                                                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No debounce      | A request on every keystroke. Each one is aborted by the next, so the result on screen is still correct, but the API gets several times more requests and most of them are wasted. |
| 300 ms           | One request per typed word in most cases. The delay is hardly noticeable, because the loading indicator appears on the first keystroke, not after the delay.                       |
| 1000 ms and more | Fewer requests, but the interface feels slow: the user has finished typing and waits a full second before anything is sent.                                                        |

`debounce` (`src/shared/debounce.ts`) is written by hand: every call clears the previous timer and starts a new one, so only the last call within the delay runs.

## 3. Complexity

`mapCountryResponse` (`src/countries/api/map-country-response.ts`) goes through the array once. For each country it also goes through its languages, currencies and borders.

- Time: `O(n · (l + c + b))`, where `n` is the number of countries and `l`, `c`, `b` are the numbers of languages, currencies and borders of one country.
- `l`, `c` and `b` are small and bounded (a country has a handful of each), so in practice this is `O(n)`.
- Memory: `O(n)` as well. The function builds a new array and does not change its input.

`n` is at most the number of countries in the world (about 250), so the mapping is never a bottleneck. The bonus cache was not implemented.

## 4. Clean code principles

| Principle                               | Where                                                                                                                                                                                                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single responsibility                   | One function or class per file. `searchCountries` only talks to the network, `mapCountryResponse` only converts data, `classifyError` only names the error, `SearchController` only decides what state the search is in, files in `src/countries/ui/` only build DOM. |
| Dependency injection                    | `SearchController` receives the search function and the listener through its constructor. Tests pass a fake function; `src/main.ts` passes the real `searchCountries`.                                                                                                |
| Separate API shape and UI model         | `RawCountry` (everything optional, as the API sends it) and `Country` (no optional fields) in `src/countries/types/`. Only `mapCountryResponse` knows both. The UI never checks for `undefined`.                                                                      |
| Pure functions                          | `mapCountryResponse`, `classifyError`, `formatCount` in `render-app.ts`, `describeCountry` in `country-details.ts`: same input, same output, no side effects.                                                                                                         |
| Impossible states are not representable | `SearchState` (`src/countries/types/search-state.ts`) is a discriminated union. There is no way to have `countries` together with an error, and the `switch` in `renderResults` must handle every status.                                                             |
| Errors are handled in one place         | `searchCountries` has no `try/catch`: it throws `HttpError` and lets everything propagate. The only `catch` is in `SearchController.run`, and it does not swallow errors, it classifies them.                                                                         |
| No magic values                         | `SEARCH_DEBOUNCE_MS`, `SEARCH_TIMEOUT_MS`, `NOT_FOUND`, `ERROR_MESSAGES`; every color and size is a variable in `src/styles/_tokens.scss`.                                                                                                                            |
| Do not repeat yourself                  | `createElement` (`src/shared/create-element.ts`) replaces repeated DOM boilerplate; `createStatusMessage` draws both the "nothing found" and the error panel.                                                                                                         |
| Safe by construction                    | Dynamic content is built with `createElement` and `textContent`. `innerHTML` is not used anywhere, so text from the API cannot become markup.                                                                                                                         |

## 5. Tests

The logic is covered by 62 unit tests (Vitest, `node` environment). UI functions have no unit tests and are checked manually with the behaviour checklist in the pull request.

| FIRST           | How                                                                                 |
| --------------- | ----------------------------------------------------------------------------------- |
| Fast            | Fake timers instead of real delays, a mocked `fetch` instead of the network         |
| Independent     | Every test creates its own controller and mocks                                     |
| Repeatable      | No real clock, no real network                                                      |
| Self-validating | Only `expect` assertions, nothing to read by eye                                    |
| Timely          | Test commits come before implementation commits (see the table in the pull request) |
