# Reader components

- Mozilla Readability 0.6.0, Mozilla contributors, Apache License 2.0. [Source and license](https://github.com/mozilla/readability/tree/0.6.0). Used as a dependency without source modifications; bundled package license must accompany distribution.
- jsdom 30.1.3, jsdom contributors, MIT. [Source and license](https://github.com/jsdom/jsdom/tree/30.1.3).
- Playwright 1.64.1, Microsoft contributors, Apache License 2.0. [Source and license](https://github.com/microsoft/playwright/tree/v1.64.1). The runtime uses the user's locally installed Chromium browser through playwright-core.
- Trafilatura 2.3.1, Adrien Barbaresi and contributors, Apache License 2.0. [Project](https://github.com/adbar/trafilatura). Evaluation environment only; older pre-1.8 releases used GPLv3+, which does not describe the pinned evaluated release.
- Crawl4AI 0.9.5, evaluation environment only, Apache text with additional attribution requirement in its root [LICENSE](https://github.com/unclecode/crawl4ai/blob/v0.9.5/LICENSE). No source copied into the project; no production Python service added.

This product includes software developed by UncleCode (https://x.com/unclecode) as part of the Crawl4AI project (https://github.com/unclecode/crawl4ai).

The benchmark CLI includes the same attribution in `--help`. Crawl4AI is not used by the application runtime; if it is later shipped in a web runtime, carry its required attribution into About/Credits before release. Keep licenses/NOTICE files supplied by all installed packages when redistributing them. Live cached web documents retain their original publishers' rights; they are research inputs, not relicensed project code.
