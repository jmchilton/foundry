# Glossary

Pinned definitions for the Galaxy Workflow Foundry. Used by the PRD, design docs, and the eventual MOLD_SPEC. If two docs disagree on a term, this file wins; resolve drift by updating here first.

Alphabetical.

---

**Branch** *(`[branch]` annotation, phase kind)* — a Pipeline phase that encodes harness-level routing/fallback rather than wrapping a Mold. Carries a named **routing pattern** (`discover-or-author`, `test-data-resolution`, …) and either `branches:` (binary with fallthrough) or `chain:` (N-step sequential fallback) of Mold wiki-links plus optional terminal sentinels (e.g. `user-supplied`). Inner wiki-links resolve to Molds and are validator-checked. Renders on a subway map as a decision diamond. Replaces the prior `[harness]` annotation umbrella.

**Cast** *(verb)* — produce a self-contained skill artifact from a Mold via the casting process. *(noun)* — synonym for **cast skill**. Example: "the cast of `implement-galaxy-tool-step` for the Claude target."

**Cast skill** — the compiled artifact produced by casting a Mold. Self-contained, condensed, no links back to the Foundry, no runtime dependency on it. Frozen against the Foundry version it was cast from. May target Claude's skill format, a web-app-baked skill, a generic format, etc.

**Cast target** — an output format that casting can produce. Examples: Claude skill directory, skill baked into a web application, generic (non-Claude) skill format. A single Mold may cast to several targets.

**Casting** — the LLM-driven process that produces a cast skill from a Mold. Operates as **per-kind dispatch** over the Mold's typed references (see *Reference kind*): patterns get LLM-condensed, schemas get copied verbatim, manpages get cast to JSON sidecars, examples get copied, prompts get inlined, evals get dropped. The casting process is non-deterministic by design and expected to evolve as models improve.

**CLI Mold** — a Mold whose primary content is a CLI's reference surface. Examples: `gxwf-cli`, `planemo-cli`. Casts roll up the relevant `cli/<tool>/*` manual-page content into a structured runtime artifact (typically JSON) plus a thin procedural overview — *not* a markdown dump of `--help` output. Per-action Molds (`discover-shed-tool`, `validate-with-gxwf`, `run-workflow-test`) reference individual manual pages directly rather than depending on the whole-CLI Mold.

**CLI manual page** — a Foundry content note describing a single CLI command or subcommand (synopsis, args, flags, examples, exit codes, output shape, error patterns, gotchas). Lives at `content/cli/<tool>/<cmd>.md`. Hand-authored or seeded from `--help` then humanized. Wiki-linked from CLI Molds and from per-action Molds. Cast to a structured sidecar by the casting pipeline; not inlined as prose.

**Composed path** — a harness pipeline that uses CWL as a structured intermediate target before reaching Galaxy. Examples: `PAPER → CWL → GALAXY`, `NEXTFLOW → CWL → GALAXY`. Contrasts with **direct path**. Both are first-class options.

**Corpus-first** — the principle that everything in the Foundry (patterns, Molds, design guidance) is grounded in observed structure of real IWC workflows, not invented top-down. Anything in the Foundry should be traceable back to one or more IWC exemplars.

**Direct path** — a harness pipeline that targets Galaxy without going through a CWL intermediate. Examples: `NEXTFLOW → GALAXY`, `PAPER → GALAXY`. Contrasts with **composed path**.

**Discover-or-author branch** — a `[branch]` routing pattern (named `discover-or-author`) used in Galaxy-targeting per-step loops: try `discover-shed-tool` first; on fallthrough, invoke `author-galaxy-tool-wrapper`. The branch itself is harness logic; the two underlying capabilities are clean Molds. (`discover-shed-tool` may have siblings later — `discover-tool-via-galaxy-api`, `discover-tool-on-github` — each named for the mechanism it uses, not the goal.)

**Evaluation plan** — Mold-owned content that describes how a cast skill is exercised: which IWC exemplars it should reproduce or align with, pass/fail or qualitative criteria. Lives alongside the Mold in the Foundry. **Not** packaged into cast skills — evals are Foundry-maintainer infrastructure, not consumer-facing.

**Foundry** *(short for Galaxy Workflow Foundry)* — the standalone knowledge base where Pipelines, Molds, pattern pages, CLI manual pages, IO schemas, and IWC-citing content live. Renders as a navigable site; serves as the source of truth that casting reads.

**Gate** *(`[gate]` annotation, phase kind — future)* — placeholder for a phase-level annotation marking an inline approval / scope-confirmation checkpoint. Coined when a real pipeline first needs an inline pause for user input; not used by any current pipeline. The phase-kind set is open and not pre-enumerated — `[branch]` and `[gate]` are unrelated behaviors and don't share an umbrella tag.

**Galaxy Workflow Foundry** — the project's full name. See **Foundry**. Subtitle of choice for documents and presentations.

**gxformat2** — Galaxy's Format-2 workflow format. The target format for Galaxy-targeting authoring Molds.

**gxwf** — the design-time CLI tool. Workflow validation, tool discovery / search / revisions, schema, conversion, lint. Available in TypeScript and Python; both share an interface. Inside the Foundry, gxwf's CLI surface is captured as **CLI manual pages** (`content/cli/gxwf/*`) and rolled up by the **`gxwf-cli` Mold**; the existing `~/.claude/skills/gxwf-cli` (a help-text dump) is the prior art being replaced. Contrasts with **Planemo**.

**Harness** — hand-authored orchestration glue that sequences Molds, manages user-approval gates, maintains run state, handles routing decisions (e.g., the discover-or-author branch). Not cast from a Mold; not in the Foundry's casting pipeline. May be heavyweight (Archon-style) or a lightweight orchestration skill.

**Harness-level concern** — a recurring pipeline activity that belongs to the harness, not to any individual Mold. Examples: approval gates, scope confirmation, plan presentation, tool-discovery routing, test-data fallback chains, state and resumption. These are **not Molds**. Some of them surface inline in pipelines as non-Mold phase kinds (`[branch]` for routing, the future `[gate]` for checkpoints); others (state, resumption, autonomy posture) are off-pipeline harness-internal concerns. See the relevant section of `INITIAL_HARNESS_PIPELINES.md`.

**IWC** — Intergalactic Workflow Commission. Curates the canonical set of high-quality Galaxy workflows. The Foundry's foundational corpus.

**IWC exemplar** — one workflow from the IWC corpus. The cleaned `gxformat2` versions live in `/Users/jxc755/projects/repositories/workflow-fixtures/iwc-format2/`. Pattern pages cite exemplars; Molds reference them as ground truth; casting may inline references; evaluations exercise cast skills against them.

**Loop** *(`[loop]` annotation)* — a phase-level flag (`loop: true` in frontmatter) marking a phase that runs once per step in the workflow being constructed. Applied to per-step authoring phases (`implement-galaxy-tool-step`, `validate-with-gxwf`, …) and to `[branch]` phases that route per-step (`discover-or-author`). Renders on a subway map as a decorated station.

**Mold** — an abstract, structured template inside the Foundry that describes a workflow-construction action. Authored as a **typed reference manifest with a presentation layer**: a `.md` file whose frontmatter declares typed references to heterogeneous artifacts (pattern pages, CLI manual pages, IO schemas, prompt fragments, examples), and whose body is a procedural skeleton that ties them together. Rendered as a navigable Foundry page; cast into one or more cast skills via casting's per-kind dispatch over those references.

**Mold (atomic, phase-sized)** — the granularity rule: each Mold is roughly the size of one Mold-shaped phase in a Pipeline. Not necessarily small; `summarize-nextflow` and `implement-galaxy-tool-step` are both atomic at this tier even though they differ in content size.

**Not a Mold** — explicit boundary marker for things that are *not* cast from the Foundry. Includes harnesses, harness-level concerns (state, resumption, autonomy posture), Pipelines themselves, non-Mold phase kinds (`[branch]`, future `[gate]` — these reference Molds via embedded wiki-links but are not Molds), and pure reference content (pattern pages, CLI manual pages, IO schemas — these are *referenced by* Molds, not Molds themselves). Wrapping a CLI is *not* a disqualifier: see `validate-with-gxwf`, `discover-shed-tool`, `run-workflow-test`.

**Pattern page** — a Foundry reference page describing a Galaxy workflow construction pattern (collection manipulation, tabular manipulation, conditional handling, custom-tool authoring, …). Wiki-linked from action Molds; pulled into cast skills via casting's pattern-kind dispatch (LLM-condensed, mixed verbatim and summarization). Different from a Mold: a pattern page is reference, a Mold is action. Some patterns have a companion action Mold (e.g., custom-tool-authoring pattern + `author-galaxy-tool-wrapper` Mold).

**Phase** — one atomic unit of a Pipeline's ordered `phases` array. Either Mold-shaped (`mold: [[...]]`, optionally `loop: true`) or a non-Mold annotation kind: `[branch]` today, future `[gate]` when needed. Open set — new phase kinds are coined when first surfaced inline rather than pre-enumerated. Validator resolves embedded wiki-links per kind (Mold-shaped phases must resolve to `type: mold`; `[branch]` inner items resolve to Molds or are terminal sentinels like `user-supplied`).

**Pipeline** — first-class Foundry note type (`type: pipeline`, `content/pipelines/<slug>.md`). An ordered sequence of phases that compose into a harness journey (`paper-to-galaxy`, `nextflow-to-galaxy`, `cwl-to-galaxy`, `paper-to-cwl`, `nextflow-to-cwl`). Dual purpose: (a) **build artifact** — names the Molds a harness will orchestrate; (b) **navigation primitive** — the journey-surface IA over the KB, rendered as a subway map. `phases` frontmatter is the machine-readable spine; the body is the human-readable view. Pipelines are *referenced content*, not cast. The Mold-inventory invariant ("Molds = union of pipeline phases") is machine-checked: every Mold-shaped phase resolves to a real Mold note, and Molds with no pipeline membership surface as inventory-coverage warnings (excluding drafts and `axis: tool-specific`).

**Planemo** — the runtime CLI tool. Executes Galaxy *and* CWL workflows. Used by `run-workflow-test`, `debug-galaxy-workflow-output`, `debug-cwl-workflow-output`. Inside the Foundry, Planemo's CLI surface is captured as **CLI manual pages** (`content/cli/planemo/*`) and rolled up by the **`planemo-cli` Mold**, parallel to gxwf. Contrasts with **gxwf**.

**Reference kind** — the type discriminator on a Mold's typed references; controls casting behavior. Provisional kinds: `pattern` (markdown reference, LLM-condensed), `cli-command` (manual page, cast to JSON sidecar), `schema` (JSON Schema file, copied verbatim), `example` (fixture, copied verbatim), `prompt` (markdown fragment, inlined verbatim), `eval` (Foundry-only, never in cast). Per-kind dispatch is what makes casting more than "resolve all wiki links the same way."

**Routing pattern** — the named-pattern value inside a `[branch]` phase that determines its inner shape and rendering. Initial vocabulary: `discover-or-author` (binary with `branches:` and a `fallthrough:` step) and `test-data-resolution` (sequential `chain:` of Mold wiki-links ending in a terminal sentinel like `user-supplied`). Open question whether the set graduates into a closed schema enum or stays open with validator coverage of embedded wiki-links only.

**Schema (Mold IO)** — a JSON Schema file declaring the input or output shape of a Mold (e.g., the per-source summary schemas, the Galaxy tool summary schema). Lives in `schemas/` (a non-content directory; not a vault note). Referenced by Molds via typed-path frontmatter fields; copied verbatim into cast bundles by casting. Distinct from `meta_schema.yml`, which is the *frontmatter* contract for content notes.

**Subway map** — informal name for the visual rendering of a Pipeline as a vertical line of stops: Mold-shaped phases are linked stations, `[loop]` decorates per-step stations, `[branch]` stops are decision diamonds with their inner branches/chains expanded, future `[gate]` stops would render as checkpoint markers. Off-ramps per stop point to the patterns / CLI manpages / schemas the Mold references — the reference-surface drill-downs from a journey-surface point. Rendered by `pipelines/[slug].astro` (deferred until off-ramp content density justifies the visual).

**Source-specific** *(Mold axis)* — a Mold whose content depends on the input format. Examples: `summarize-paper`, `summarize-nextflow`, `summarize-cwl`. Each emits its own schema by design — no shared summary schema.

**Target-specific** *(Mold axis)* — a Mold whose content depends on the output target. Examples: `summary-to-galaxy-template`, `summarize-galaxy-tool`, `validate-cwl`.

**Tool-specific** *(Mold axis)* — a Mold whose content depends on a specific external tool's CLI surface. Examples: `gxwf-cli`, `planemo-cli`. (Provisional axis value; may merge into `generic` if the distinction stays uninteresting.)

**Generic** *(Mold axis)* — a Mold whose content depends on neither source nor target nor a single tool. Rare in the current inventory.

**Validation posture (schema, not caveats)** — the Foundry's stance on failure modes: gxwf static schema validation catches the failure modes prior-art skills had to enumerate as prose caveats (UUID validity, tool-ID/owner/+galaxyN, parameter-name mismatches, etc.). The Foundry does **not** maintain a parallel caveat catalog; the validation loop (`author → validate → fix`) is the enforcement mechanism, run inline per step.
