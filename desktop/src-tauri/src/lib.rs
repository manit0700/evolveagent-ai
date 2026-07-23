// EvolveAgent desktop shell.
//
// Thin native window around the shared React frontend. Theme divergence is
// handled in the web bundle via `data-platform="desktop"` (see frontend
// main.jsx + styles/ea-theme.css): denser dark command-center tokens, while
// the browser build stays light/calm. This Rust layer stays capability-light
// (no shell/fs/arbitrary network) so desktop keeps EvolveAgent's safety model.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running the EvolveAgent desktop app");
}
