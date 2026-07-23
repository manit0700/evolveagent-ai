# Frontend vs desktop UI differentiation

## What is shared today

The desktop app under `desktop/` is a **Tauri v2 wrapper**. It loads the same
React bundle as the web app:

- Dev: Vite at `http://localhost:5173`
- Release: `frontend/dist`

There is **no separate desktop React tree**. Product structure (pages, routes,
services) stays shared on purpose.

## How the looks differ

At boot, `frontend/src/main.jsx` detects Tauri and sets:

```html
<html data-platform="web|desktop">
```

`frontend/src/styles/ea-theme.css` maps that attribute to two token sets:

| | Web | Desktop |
|---|---|---|
| Feel | Light, calm, airy | Darker, denser command center |
| Background | Soft slate gradient | Near-black graphite |
| Density | Comfortable spacing | Tighter radius / gaps / sidebar |
| Accent | Restrained teal | Cool sky on dark surfaces |
| Shadows | Soft depth | Flat borders, less glow |

Shared components (`GlassCard`, shell, badges, chat) read CSS variables, so they
flip with the platform without a second component library.

## Desktop framing polish

`desktop/src-tauri/tauri.conf.json` uses an overlay title bar, slightly larger
default window, and traffic-light offset so the native chrome feels less like a
browser tab.

## Future desktop-only divergence

If product needs a true split later, prefer one of:

1. **Token + density only** (current path) — keep one tree, diverge via CSS.
2. **Feature flags** — `data-platform="desktop"` gates denser layouts or hidden
   marketing chrome.
3. **Separate shell package** — only if desktop needs native menus, multi-window,
   or layouts that fight the web IA.

Do not fork page business logic unless a capability truly cannot be shared.
