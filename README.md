# Vibe TD

Vibe TD is a browser-based tower defense prototype that showcases a fast build phase and manual wave control. Players select a map when the page loads, set up their defenses, and decide exactly when to unleash incoming waves. The project is designed for static hosting (for example on GitHub Pages at [https://td.trmp.dev](https://td.trmp.dev)).

## Features
- **Map selection overlay** shown on load with support for multiple handcrafted maps that share the same core mechanics.
- **Build-first gameplay** that keeps the game idle until you choose to start the first wave.
- **Manual wave cadence** via a dedicated "Start Wave" button and a pause/resume toggle.
- **Tower management tools** including upgrades, selling, and detailed stats for each tower.

## Getting started locally
1. Clone or download this repository.
2. Open `index.html` in any modern desktop browser.
3. When the map menu appears, pick a level to load the game board, place towers, and press **Start Wave 1** when you are ready.

## Controls
- **Basic/Rapid/Sniper/Frost Tower buttons** – enter placement mode for the chosen tower (if you have enough money).
- **Start Wave** – launches the next wave when you are ready; the game never forces waves automatically.
- **Pause** – toggles the global pause state; you can also press <kbd>Space</kbd>.
- **Change Map** – reopen the map selection overlay at any time to switch levels.
- **Upgrade / Sell** – manage the selected tower.
- Keyboard shortcut <kbd>N</kbd> also starts the next wave.

## Adding new maps
Maps are defined in `MAP_LIBRARY` inside `game.js`. Each entry contains:
- A `layout` array describing the path tiles (`1`) and buildable tiles (`0`).
- A `path` array that lists the path tiles in the order enemies should follow them.

To create a new map, add another object to `MAP_LIBRARY` with an `id`, `name`, `description`, `layout`, and `path`. The map picker automatically lists every entry.

## Deploying to GitHub Pages
1. Push the repository to a GitHub project configured for Pages (for example using the `main` branch).
2. Ensure the included `CNAME` file matches your custom domain (`td.trmp.dev`).
3. Wait for GitHub Pages to build the site, then visit your configured domain.

## Working in a dev environment without caching
This repository is configured to avoid caching so you always receive a fresh copy when testing changes locally or on a staging URL:

- `index.html` disables browser caching with `Cache-Control`, `Pragma`, and `Expires` meta tags.
- The root-level `_headers` file sets `Cache-Control: no-store` for every asset when deploying to platforms that support static headers (such as Cloudflare Pages), ensuring CSS, JavaScript, and audio reload on every request.

If additional cache busting is required on Cloudflare Pages:

1. Open **Pages → [your project] → Settings → Caching** and set **Cache level** to **Bypass** with **Edge TTL** at `0` seconds.
2. Add a Pages rule or response header transform that forces `Cache-Control: no-store` for the routes you are testing.
3. When testing changes, also use the **Purge cache** button or the `wrangler pages deployment purge` command to clear any previously stored assets.

Enjoy defending the vibe!
