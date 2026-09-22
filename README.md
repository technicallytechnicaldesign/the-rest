# the-rest

A compact front door for miscellaneous instruments, systems, and
half-projects. It is deliberately hand-maintained, but the cards now carry
their own taxonomy so the page can be filtered by what a thing does.

## Card metadata

Every card has a space-separated `data-tags` attribute. The filter buttons in
`index.html` use those tag names directly:

- `sound`
- `interactive`
- `generative`
- `live-data`
- `reference`

Extra descriptive tags (for example `hub`, `variant`, and `kid-friendly`)
can appear on a card without receiving a top-level filter. Keep public cards
as links, with destination paths relative to this repository where a project
ships inside `the-rest`.

## Embedded projects

`rimedaemon/` is a self-contained, browser-only RIME/DAEMON deployment.
Its readable React source lives in `rimedaemon/src/`; `rimedaemon/assets/`
contains the static bundle served by GitHub Pages. It uses no account, upload,
or server-side generation.

**Live page:** `index.html`, served at
`https://technicallytechnicaldesign.github.io/the-rest/`.

