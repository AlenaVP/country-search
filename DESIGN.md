# Design notes

Country Search is a live search over `GET https://countries.dev/name/{query}`. This document explains the decisions behind the asynchronous part and the code structure.

## 1. Cancelling stale requests

### How it works

All of it lives in `SearchController` (`src/countries/state/search-controller.ts`).

1. Every `input` event calls `search(input)`.
2. The first line of `search` is `this.abortController?.abort()`. The request that is in flight is cancelled immediately, before the debounce timer is even restarted.
3. Empty input reports `idle` and stops: no request is sent.
4. Otherwise the controller reports `loading` and schedules `run(query)` through `debounce`.
5. `run` aborts a request that is still alive, creates a new `AbortController` for this one request and passes its `signal` to the search function. In the app this is `searchCountries` behind the cache wrapper (section 6); the signal reaches `fetch`.
6. An aborted `fetch` rejects with `AbortError`. `classifyError` returns `'aborted'` for it, and the controller ignores this kind: the user never sees their own cancellation as an error.

`retry()` and `searchNow(query)` (a click on a history item) skip the debounce but go through the same `run`. So one rule holds on every path: at most one request is alive.

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

The race test (`src/countries/state/search-race.test.ts`) proves the cancellation is real: its `fetch` mock answers the later request first and rejects with `AbortError` only when the signal is aborted. Without the `abort()` calls in the controller all three tests in this file fail.

That the abort happens on every input change, and not only when the next request starts, is pinned by two tests in `src/countries/state/search-controller.test.ts`: "aborts the active request immediately on a new input, without waiting for the debounce" and "aborts the active request when the input is cleared". Removing `this.abortController?.abort()` from `search` makes both fail.

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

`n` is at most the number of countries in the world (about 250), so the mapping is never a bottleneck.

### Cache and in-flight deduplication (bonus)

`createCachedSearch` (`src/countries/api/cached-search.ts`) keeps two `Map` objects keyed by the query string: `cache` (query → countries) and `inFlight` (query → shared request). `Map` operations take `O(1)` time on average.

| Operation                                 | Time             | Why                                                                                     |
| ----------------------------------------- | ---------------- | --------------------------------------------------------------------------------------- |
| Repeated query (cache hit)                | `O(1)`           | One `cache.get`. The stored array is returned as is, nothing is copied or mapped again  |
| First query (cache miss)                  | `O(1)` + request | `cache.get`, `inFlight.get`, `inFlight.set`, then the usual request and `O(n)` mapping  |
| Joining a request that is in flight       | `O(1)`           | `inFlight.get`, a counter increment and a `Promise.race` of two promises                |
| A caller cancels                          | `O(1)`           | Its own promise is rejected and the counter is decremented; the last caller also aborts |
| The shared request finishes               | `O(k)`           | One `cache.set` and one `inFlight.delete`; each of the `k` waiting callers is resolved  |
| `k` identical simultaneous calls in total | `O(k)`           | One network request and one mapping instead of `k`                                      |

Hashing the key costs `O(L)` for a query of `L` characters. Queries are a few characters long, so this is treated as a constant.

Memory:

- `cache`: `O(q · r)`, where `q` is the number of distinct queries in the session and `r` is the number of countries in one answer (at most about 250). There is no eviction on purpose: `q` grows only as fast as a person types, the data does not change during a session, and a page reload clears everything.
- `inFlight`: `O(s)`, where `s` is the number of requests in flight at the same moment. The controller keeps one live request, so in this app `s` is 1.

The search history (`src/countries/state/search-history.ts`) holds at most `HISTORY_LIMIT = 5` strings, so `list` and `add` are `O(1)`.

## 4. Clean code principles

| Principle                               | Where                                                                                                                                                                                                                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single responsibility                   | One function or class per file. `searchCountries` only talks to the network, `mapCountryResponse` only converts data, `classifyError` only names the error, `SearchController` only decides what state the search is in, files in `src/countries/ui/` only build DOM.                   |
| Dependency injection                    | `SearchController` receives the search function and the listener through its constructor. Tests pass a fake function; `src/main.ts` passes `createCachedSearch(searchCountries)`. `SearchHistory` receives its storage the same way: `localStorage` in the app, a fake object in tests. |
| Separate API shape and UI model         | `RawCountry` (everything optional, as the API sends it) and `Country` (no optional fields) in `src/countries/types/`. Only `mapCountryResponse` knows both. The UI never checks for `undefined`.                                                                                        |
| Open for extension, closed for change   | The cache was added as a wrapper with the same signature as `searchCountries` (`createCachedSearch` in `src/countries/api/cached-search.ts`). Neither `searchCountries` nor `SearchController` had to change for it; only one line in `src/main.ts` did.                                |
| Pure functions                          | `mapCountryResponse`, `classifyError`, `formatCount` in `render-app.ts`, `describeCountry` in `country-details.ts`: same input, same output, no side effects.                                                                                                                           |
| Impossible states are not representable | `SearchState` (`src/countries/types/search-state.ts`) is a discriminated union. There is no way to have `countries` together with an error, and the `switch` in `renderResults` must handle every status.                                                                               |
| Errors are handled in one place         | `searchCountries` has no `try/catch`: it throws `HttpError` and lets everything propagate. The only `catch` is in `SearchController.run`, and it does not swallow errors, it classifies them.                                                                                           |
| No magic values                         | `SEARCH_DEBOUNCE_MS`, `SEARCH_TIMEOUT_MS`, `HISTORY_LIMIT`, `NOT_FOUND`, `ERROR_MESSAGES`; every color and size is a variable in `src/styles/_tokens.scss`.                                                                                                                             |
| Do not repeat yourself                  | `createElement` (`src/shared/create-element.ts`) replaces repeated DOM boilerplate; `createStatusMessage` draws both the "nothing found" and the error panel.                                                                                                                           |
| Safe by construction                    | Dynamic content is built with `createElement` and `textContent`. `innerHTML` is not used anywhere, so text from the API cannot become markup.                                                                                                                                           |

## 5. Tests

The logic is covered by 90 unit tests (Vitest, `node` environment). UI functions have no unit tests and are checked manually with the behaviour checklist in the pull request.

| FIRST           | How                                                                                 |
| --------------- | ----------------------------------------------------------------------------------- |
| Fast            | Fake timers instead of real delays, a mocked `fetch` instead of the network         |
| Independent     | Every test creates its own controller and mocks                                     |
| Repeatable      | No real clock, no real network                                                      |
| Self-validating | Only `expect` assertions, nothing to read by eye                                    |
| Timely          | Test commits come before implementation commits (see the table in the pull request) |

## 6. Bonus: cache, in-flight deduplication, search history

### Cache by query string

`createCachedSearch(searchFn)` returns a function with the same signature as `searchCountries`, so the controller does not know whether an answer came from the network or from memory.

- Key: the query string exactly as the controller sends it (already trimmed).
- Stored: successful answers, including the empty one (404 means "no matches", which is a valid answer).
- Never stored: errors, timeouts and cancelled requests. Retry therefore always goes to the network.
- Lifetime: in memory until the page is reloaded.

Typing a query, clearing the field and typing the same query again sends one request, not two.

### Deduplication with a signal per caller

When a call arrives for a query that is already in flight, it does not start a second request: it waits for the same shared promise. The difficult part is cancellation, because there are two different things to cancel.

|               | The caller's signal                         | The shared request's signal                                 |
| ------------- | ------------------------------------------- | ----------------------------------------------------------- |
| Owner         | `SearchController`, one per `run`           | The cache wrapper, one per network request                  |
| Aborted when  | The input changes                           | The last caller has left and the answer has not arrived yet |
| What it stops | Only this caller's wait (`Promise.race`)    | The real `fetch`                                            |
| Result        | This caller gets `AbortError`, others go on | The request is `canceled` in the Network tab                |

If the caller's signal went straight into `fetch`, one caller changing its mind would break the request for everyone who shares it. With a separate signal and a counter of callers this cannot happen, and a request that nobody waits for is still really cancelled.

This keeps the main rule of section 1 intact. `search()` still calls `abort()` first on every input change; the caller's promise rejects with `AbortError`; its `finally` block sees that no caller is left and aborts the shared request. All of this happens before the debounce timer fires. The three race tests also pass with `createCachedSearch(searchCountries)` in place of `searchCountries`.

The controller keeps one live request, so two callers of the same in-flight request are rare in this app: it happens when the user types a query and, within the debounce delay, clicks the same query in the history. The behaviour itself is covered by the tests in `src/countries/api/cached-search.test.ts`: a shared request, a failure delivered to every caller, one caller cancelling without breaking the others, and a real abort when the last caller leaves.

### Search history

`SearchHistory` (`src/countries/state/search-history.ts`) stores the latest queries in `localStorage` as a JSON array.

- A query is saved when its search succeeds. Queries with no matches and failed requests are not saved.
- Newest first, at most `HISTORY_LIMIT = 5` items.
- A saved query that the new query starts with is removed. This drops an exact repeat and also the unfinished beginnings left by slow typing ("g", "ge" before "ger").
- What is read from the storage is validated: anything that is not an array of strings becomes an empty list, and a failed write is ignored. A broken or full storage never breaks the search.

A click on a history item puts the query into the input and calls `controller.searchNow(query)`, which skips the debounce. If the answer is in the cache, the result appears at once and no request is sent; after a page reload the cache is empty, so the first click sends one request.
