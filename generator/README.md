# ShipClips video generator

Builds a retention-style HyperFrames video (1080x1920, fast cuts, word pops, progress bar,
original synthesized sound effects) from a short JSON spec.

    node generator/build.mjs spec.json outDir
    cd outDir && HYPERFRAMES_BROWSER_PATH=<chromium> npx hyperframes check && npx hyperframes render -o video.mp4

Spec: {"id", "theme": {bg, ink, accent, accentInk, card, cardInk, line, muted, border, shadow, badgeBg, badgeInk},
"beats": [hook | big | card | list | cta]}
- hook/big: {"kicker"?, "lines": [...], "em": index of accent line}
- card: {"title", "rows": [...], "badge"?}
- list: {"title", "items": [...]}
- cta: {"name", "line", "url"}

Screen time is set from word count (about 4 words a second) so every screen can be read.
Use only the customer's own wording and real features. Customer specs and videos never go in this repo.

Sound: videos are silent by default. Set "sound": true in the spec to add the placeholder effects in sfx/.
Replace sfx/ with a properly licensed library before offering sound to customers.
