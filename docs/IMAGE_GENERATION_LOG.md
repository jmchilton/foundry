# Image Generation Log

Reference prompts and generated-image paths used while exploring visual treatments for the public site. These are concept references only; committed site artifacts should be rebuilt as maintainable Astro, SVG, and CSS unless a raster image is explicitly needed.

## 2026-05-01 — Casting Molds Story Infographic

Generated reference:

`/Users/jxc755/.codex/generated_images/019de5d0-4370-7d13-bc9d-9c4457e589f5/ig_0263192a4800091a0169f53adfd7f88190b5b9c185d87a1353.png`

Committed site asset:

`site/public/images/casting-molds-story.png`

Implementation:

- `site/src/components/FoundryStory.astro`
- `site/src/pages/story/index.astro`

Prompt:

```text
Use case: infographic-diagram
Asset type: visual concept reference for an Astro documentation site infographic, not a final production asset

Primary request: Create a refined editorial infographic concept for Galaxy Workflow Foundry using an old-timey mold/cast metaphor. Revise the right side so the Cast skills do not merely sit as finished packages: they connect outward into pipeline capabilities. The connectors under/right of "Cast skills" should visually echo the drop-down connectors below "Casting Molds": clean branching rails, short vertical drops, and right-facing connector arms.

Core thesis to communicate: A traditional knowledge base becomes actionable through Casting Molds. Molds make static skills transparent, richly documented, statically validated, and portable. Cast skills can then compose into validated, actionable pipelines.

Use these exact main labels and avoid adding unrelated labels.
Left zone label: "Knowledge base"
Left zone contents: linked note cards and reference plates labeled exactly: "Patterns", "Research", "CLI Docs", "Schemas", "Best Practices".
Center hero label: "Casting Molds"
Center visual: an old-timey casting mold / letterpress chase / metal type press, simplified into clean vector-like geometry. Show one prominent structured Mold card entering the press, labeled "Mold manifest". Include tiny etched Mold examples on metal slugs or plates: "summarize-nextflow", "implement-galaxy-tool-step", "validate-with-gxwf", "planemo-cli". Highlight "planemo-cli" slightly more than the others, as the CLI documentation example.
Right zone label: "Cast skills"
Right zone contents: cooled portable artifact cards/bundles labeled exactly: "Claude skill", "web artifact", "generic skill". One visible example tag: "summarize-nextflow / SKILL.md".

New right-side output connectors: from the Cast skills group, draw three clean branch/drop connectors, matching the connector style below the casting mold, leading to three output chips labeled exactly: "composable", "validated", "actionable pipelines". The words should read as a linked progression, not as three disconnected marketing badges. Prefer a small rail/subway-map feel for these connectors.

Small property chips around the center or output, exact labels: "transparent", "documented", "statically validated". Use "actionable pipelines" only in the right-side output connector chip. Do not use the word "reproducible" in the image.

Composition: wide 16:9, three-zone flow from left to center to right. Use a restrained gold rail or molten-gold stream moving through the center mold, then a cleaner navy/gold branching rail from Cast skills to the three output chips. Avoid a full architecture layer cake.

Style: restrained technical editorial, crisp flat/vector-like rendering, accessible documentation-site aesthetic, subtle 24px grid background, light theme, sharp readable typography inspired by Atkinson Hyperlegible, small monospace detail labels, compact annotations, minimal rounded corners, no card-in-card clutter.

Color palette: Galaxy navy #25537b, dark slate #2c3143, muted gray #58585a, white #ffffff, raised surface #f6f8fa, pale blue hover surface #edf4fa, accent gold #e8c547 / #ffd700, subtle borders #d1d5db. Optional foundry-metal accents in warm gray only, not brown/orange dominant.

Visual metaphor details: mold halves, registration pins, cast metal slugs, letterpress blocks, stamped labels, provenance stamp, cooling tray. Keep the machinery iconic and clean, not steampunk. It should read as "mold/cast" immediately without becoming a fantasy illustration.

Avoid: exhaustive layer cake, the word "reproducible", labels like "casting owns target artifacts", labels like "Tool Shed lint", labels "Pipelines" or "Design Docs" or "CLI Pages", photorealism, heavy industrial grime, dark poster background, neon cyberpunk, 3D glassmorphism, purple gradients, mascot characters, tiny unreadable text, dense paragraphs, long baked-in prose, random tool names not in the actual Foundry Mold inventory.
```
