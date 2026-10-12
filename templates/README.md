# ShipClips video templates

HyperFrames compositions (1080x1920, 16s) used as starting points for customer videos.

- `ledgerly/` - Light style (feature launch, product UI card)
- `querybird/` - Dark style (developer tool, terminal)
- `tidyshelf/` - Bold style (milestone, count-up)

Each folder is self-contained: `index.html` plus `assets/` (GSAP and fonts, no network needed).
Render: `HYPERFRAMES_BROWSER_PATH=<chromium> npx hyperframes render -o out.mp4` from inside the folder
(copy `hyperframes.json` and `package.json` from a `hyperframes init` project first).

Customer briefs and finished customer videos never go in this repo. It is public.
