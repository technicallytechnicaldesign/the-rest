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
- `local`

Extra descriptive tags (for example `hub`, `variant`, and `kid-friendly`)
can appear on a card without receiving a top-level filter. Keep public cards
as links; use a plain `article.card` for a local-only project so the index
doesn't pretend it has a public destination.

**Live page:** `index.html`, served at
`https://technicallytechnicaldesign.github.io/the-rest/`.

