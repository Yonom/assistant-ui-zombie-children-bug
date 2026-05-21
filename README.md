# assistant-ui zombie-children bug repro (#4051)

Verbatim reproduction of the MRE Seluj78 posted in
https://github.com/assistant-ui/assistant-ui/issues/4051 — `tapClientLookup: Index N out of bounds (length: M)` triggered by rAF-driven session swap against a deep `MarkdownTextPrimitive` subscriber tree.

Hosted: https://assistant-ui-zombie-children-bug.vercel.app

## Setup

```sh
npm install
npm run dev
```

Open the page, then paste into DevTools console:

```js
const buttons = Array.from(document.querySelectorAll('button'));
buttons.find(b => b.textContent === 'Start stream').click();
const swap = buttons.find(b => b.textContent.startsWith('Switch session'));
let frames = 0;
const loop = () => {
  if (frames++ >= 600) return;
  swap.click();
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
```

Seluj reports the crash fires within ~15s.

## Status

On the machine of @Yonom, this repo does NOT reproduce the crash —
neither in `npm run dev` nor in `npm run build && npx vite preview`,
on react@19.2.6 + the exact published versions listed in
`package.json` (which resolves to `@assistant-ui/store@0.2.10` +
`@assistant-ui/tap@0.5.11` + `@assistant-ui/core@0.1.17`, all
post-#4069).
