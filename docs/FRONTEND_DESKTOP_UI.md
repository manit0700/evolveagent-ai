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
| Feel | Light, calm, airy productivity shell | Darker denser command center |
| Background | Soft slate gradient | Flat near-black graphite |
| Density | Comfortable spacing / larger radius | Tighter gaps, smaller radius, narrower sidebar |
| Accent | Restrained teal | Cool sky on dark surfaces |
| Shadows | Soft depth | Flat borders, no card glow |
| Chrome | Browser tab + light top bar | Overlay title bar, drag region, traffic-light inset |

Shared components (`GlassCard`, shell, badges, chat, `ui/*`) read CSS variables,
so they flip with the platform without a second component library.

## Desktop-specific code (not a second UI)

| File | Role |
|---|---|
| `desktop/src-tauri/tauri.conf.json` | Window size, overlay title bar, traffic lights, CSP |
| `desktop/src-tauri/src/lib.rs` | Minimal Tauri bootstrap (no elevated capabilities) |
| `frontend/src/main.jsx` | Sets `data-platform="desktop"` when Tauri is present |
| `frontend/src/styles/ea-theme.css` | Desktop token overrides + denser spacing + drag region |

## Future desktop-only divergence

Prefer, in order:

1. **Token + density** (current) — one tree, CSS platform forks
2. **Feature flags** — hide web-only marketing chrome when `data-platform="desktop"`
3. **Separate shell package** — only for native menus / multi-window / OS integrations

Do not fork page business logic unless a capability truly cannot be shared.
