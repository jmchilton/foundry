# Initial Molds

Initial Mold inventory for the Galaxy Workflow Foundry, derived as the **union of phases** across the harness pipelines sketched in `HARNESS_PIPELINES.md`, plus the **CLI Molds** that capture reusable tool-reference content the action Molds depend on. Each Mold is atomic at the harness-step tier (not necessarily small in content).

This is a v1 candidate list, not a spec. Names, splits, and groupings will shift as we ground each Mold against IWC corpus exemplars and write the first one or two end-to-end. The point of this list is to surface what metadata a Mold actually needs, by enumerating concrete cases.

## Bucketing axes

Each Mold falls along these axes:

- **Source-specific** — input format determines content (`PAPER`, `NEXTFLOW`, `CWL`).
- **Target-specific** — output target determines content (`GALAXY`, `CWL`).
- **Tool-specific** — content depends on a specific external CLI surface (`gxwf`, `planemo`).
- **Generic** — none of the above.

This isn't a frontmatter schema; it's a mental model for v1 grouping. Whether these axes graduate into Mold metadata is a spec-time decision. `tool-specific` is provisional and may collapse into `generic` if the distinction stays uninteresting.

## Catalog

### Source summarization (source-specific, target-agnostic)

Each source emits its **own schema** by design — paper, Nextflow, and CWL are different enough that forcing a shared summary shape would either lose detail or bloat all three. Downstream Molds (data flow, templates) consume any source's summary; the cast skills are responsible for handling the polymorphism.

- `summarize-paper` — extract methods, tools/algorithms, sample data, metrics, references from a paper.
- `summarize-nextflow` — enumerate processes, channels, conditionals, containers (biocontainers / Docker / Singularity refs and their bioconda equivalents), test fixtures from an NF source tree. Container-and-env info is structured output, consumed downstream by `author-galaxy-tool-wrapper` when discovery fails.
- `summarize-cwl` — read CWL Workflow + referenced `CommandLineTool`s; surface inputs/outputs, scatter, conditional logic, and `DockerRequirement` / `SoftwareRequirement` blocks. Container-and-env info structured for downstream consumption analogous to `summarize-nextflow`.

### Data flow (target-specific)

Split by target because Galaxy and CWL have different idioms (Galaxy collections / paired collections vs. CWL scatter / valueFrom). Each consumes any source-summarizer output:

- `summary-to-galaxy-data-flow` — abstract DAG with Galaxy-shaped collection / scatter / branching idioms surfaced. Used by all Galaxy-targeting pipelines.
- `summary-to-cwl-data-flow` — abstract DAG with CWL-shaped scatter / step idioms surfaced. Used by all CWL-targeting pipelines.

### Template generation (target-specific)

- `summary-to-galaxy-template` — `gxformat2` skeleton with per-step TODOs. Wiki-links into Galaxy pattern pages (collection / tabular / conditional / custom-tool).
- `summary-to-cwl-template` — CWL Workflow skeleton with per-step TODOs.

### Per-step tool work (target-specific, runs in `[loop]`)

For Galaxy targets, the harness performs **discover-first, author-on-fallthrough**: try `discover-shed-tool` first, and only invoke `author-galaxy-tool-wrapper` when no acceptable existing wrapper is found. The branch is harness logic; the Molds cleanly split the two cases.

- `discover-shed-tool` — search the Galaxy Tool Shed for an existing wrapper matching an abstract step's needs; classify candidates by owner trust, version proximity, container availability, and `+galaxyN` revision posture; recommend a pick or fall through. References the relevant `gxwf` manual pages (`tool-search`, `tool-versions`, `tool-revisions`) and `galaxy-tool-cache`. Named for the *mechanism* (Tool Shed); leaves slots for siblings — `discover-tool-via-galaxy-api`, `discover-tool-on-github` — if/when other discovery sources are wrapped. Replaces the prior-art hand-authored `find-shed-tool` skill (see `old/PLAN_SEARCH_CLI.md` for the original CLI mapping; that work feeds this Mold's content).
- `summarize-galaxy-tool` — pull JSON schema, container, source, inputs/outputs for a candidate Galaxy tool (existing wrapper, found via `discover-shed-tool`).
- `summarize-cwl-tool` — derive a `CommandLineTool` description (container, baseCommand, inputs/outputs) for a CWL target.
- `author-galaxy-tool-wrapper` — author a new Galaxy tool wrapper (XML) when discovery yields nothing acceptable. Consumes container/environment info from the source summary (`summarize-nextflow` / `summarize-cwl` already gathered biocontainer / bioconda references) and translates them into Galaxy `<requirements>`. Wiki-links the custom-tool pattern page. **This is an action**, not a pattern — it replaces the previous `design-custom-galaxy-tool` framing as a knowledge skill.
- `implement-galaxy-tool-step` — convert an abstract step + a `summarize-galaxy-tool` output into a concrete `gxformat2` step. Consumes Galaxy pattern pages via wiki link.
- `implement-cwl-tool-step` — concrete `CommandLineTool` + Workflow step.

### Tests (mixed)

Two-step shape (translation/derivation, then assembly):

**Derivation** (gets the raw fixtures):
- `paper-to-test-data` — derive workflow test inputs from a paper (sample data, expected outputs, parameter values). Source-specific (paper), target-agnostic. Fails often because papers rarely ship usable fixtures; falls through to `find-test-data`.
- `find-test-data` — fallback when derivation from a source fails. Search IWC test fixtures, public databases, sibling workflows for usable test data matching a data-flow description (input shapes, expected output shapes, organism / data type). Source-agnostic, target-agnostic. The harness escalates to a user-supplied-data gate if `find-test-data` also fails.
- `nextflow-test-to-target-tests` — translate NF test fixtures (inputs, expected outputs, parameters) into target-shaped equivalents. Source × target.
- `cwl-test-to-target-tests` — translate CWL test fixtures into target-shaped equivalents. Source × target.

**Assembly** (turns fixtures into the final test artifact):
- `implement-galaxy-workflow-test` — assemble the Galaxy workflow test JSON (or `.gxwf-tests.yml`) from translated/derived fixtures, with assertions.
- `implement-cwl-workflow-test` — assemble CWL job file(s) and expected-output assertions from translated/derived fixtures.

The derivation Molds and assembly Molds are complementary, not redundant: derivation produces fixtures; assembly produces the test artifact. Both fire in NF→Galaxy, CWL→Galaxy, etc.

Open question: whether the `<source>-test-to-<target>-tests` family factors cleanly through a generic intermediate, or stays per-pair.

### Validation (target-specific)

Validate Molds describe the **step in the process** even where they wrap a static / structured CLI. The underlying validation is deterministic, but the cast skill is the Mold-shaped procedural description (when to run, how to interpret results, what to recommend on failure, when to loop back to authoring). Wraps gxwf / cwltool but is *not* a hand-authored CLI skill — it's a Mold that references the relevant CLI manual pages.

- `validate-with-gxwf` — run gxwf schema/lint, interpret the output, classify failures (fixable in place vs. requires re-implementation), recommend or apply fixes; re-run until clean. Runs both inline (per-step) and terminally (whole-workflow). References `cli/gxwf/validate` and friends.
- `validate-cwl` — analogous: `cwltool --validate` / schema lint, interpret, recommend/apply fixes.

### Run & debug (Planemo-backed runtime)

**Planemo is the runtime tool** (it can run both Galaxy and CWL workflows); **gxwf is the design-time tool**. Run/debug Molds reference Planemo's CLI manual pages.

- `run-workflow-test` — execute a workflow's tests via Planemo; emit structured pass/fail and outputs. Target-agnostic interface; per-target adapters if needed. References `cli/planemo/test` (and run, etc.).
- `debug-galaxy-workflow-output` — given a failing Galaxy run's outputs/logs/import warnings, classify the failure and propose fixes. Consumes the SKILLS_NF caveat catalog (UUIDs, tool-ID/owner/+galaxyN, conditional selectors, parameter-name mismatches, semantics ≠ existence) via wiki link.
- `debug-cwl-workflow-output` — given a failing CWL run's outputs/logs, classify the failure and propose fixes.

Note: this run/debug tier is sized for "smart enough as a Claude skill, but Claude could often do it ad-hoc without one." Treat them as nominally Mold-shaped for inventory completeness, but accept that they may end up thinner than the authoring Molds.

### CLI Molds (tool-specific)

Whole-CLI casts. Each rolls up all `cli/<tool>/*` manual pages under it, plus a thin procedural overview, into a structured runtime artifact (typically JSON manifest + sidecar). The cast is what an agent loads when it needs general competence with the CLI rather than a specific verb. Per-action Molds (above) reference individual manual pages directly; they do *not* depend on the whole-CLI cast.

- `gxwf-cli` — design-time CLI: validate, lint, convert, tool-search, tool-versions, tool-revisions, schema export, etc. Replaces the prior-art `~/.claude/skills/gxwf-cli` (a help-text dump); the new cast is a structured manifest, not a markdown firehose.
- `planemo-cli` — runtime CLI: workflow execution, test invocation, lint, tool/workflow scaffolding, etc.

Open question: whether one Mold per *tool* is the right granularity, or whether very large CLIs (planemo) should split into sub-Molds. v1: one Mold per tool; revisit if the cast bundle is unwieldy.

### Corpus-grounding (Galaxy-specific, generic in source)

- `compare-against-iwc-exemplar` — given a draft template or implemented workflow, find the nearest IWC exemplar(s) and surface a **structural diff** (this branch differs / IWC consistently uses pattern X here / unexpected step ordering / missing common pre-step). Retrieval is part of the comparison — there is no separate retrieval Mold. Galaxy-target only; this is the corpus-first principle delivered at authoring time.

## Not Molds

Excluded from the inventory by design. Naming them keeps the boundary visible.

- **Pure reference content.** Pattern pages (`design-galaxy-tabular-manipulation`, `design-galaxy-collection-manipulation`, `design-galaxy-conditional-handling`, the custom-tool-authoring pattern, …), CLI manual pages (`content/cli/<tool>/<cmd>.md`), and IO schemas (`schemas/*.schema.json`) are **referenced by** Molds, not Molds themselves. Casting handles each kind differently — patterns get LLM-condensed, manpages get cast to JSON sidecars, schemas get copied verbatim. See `ARCHITECTURE.md` and `COMPILATION_PIPELINE.md`.
- **Harnesses.** `nf-to-galaxy`, the conjectural Archon harness, lightweight orchestration skills — all hand-authored, sequence Molds, never cast.
- **Approval gates / scope confirmation / plan presentation.** Harness-level concerns, not Molds. See `HARNESS_PIPELINES.md` for the rationale.
- **Hand-authored prior-art skills (being replaced).** The current `~/.claude/skills/gxwf-cli` (help-text dump) and the `find-shed-tool` skill design (`old/PLAN_SEARCH_CLI.md`) are *not* Foundry artifacts; they are prior art that the `gxwf-cli` and `discover-shed-tool` Molds replace. Their content feeds the new Molds; their form does not.

**Wrapping a CLI is *not* a Mold disqualifier.** `discover-shed-tool`, `validate-with-gxwf`, `run-workflow-test`, and the CLI Molds all wrap CLIs and are all Molds. The criterion is whether there is procedural content worth casting (when to run, how to interpret, when to loop back), not whether the underlying mechanism is a CLI.

## Counts and reuse

- ~24 candidate Molds total (validate-* kept as Molds; +1 for `find-test-data`; corpus Mold renamed/reframed as `compare-against-iwc-exemplar`; `discover-shed-tool` graduated from "Not Molds"; CLI Molds `gxwf-cli` and `planemo-cli` added).
- Source-summarization tier: 3 Molds, each used by exactly the pipelines starting from that source.
- Data-flow tier: 2 Molds (`summary-to-galaxy-data-flow`, `summary-to-cwl-data-flow`). Each consumes any source summary; cast skills handle the polymorphism.
- Galaxy-target tier: `summary-to-galaxy-data-flow`, `summary-to-galaxy-template`, `discover-shed-tool`, `summarize-galaxy-tool`, `author-galaxy-tool-wrapper`, `implement-galaxy-tool-step`, `implement-galaxy-workflow-test`, `validate-with-gxwf`, `run-workflow-test`, `debug-galaxy-workflow-output`, `compare-against-iwc-exemplar` — used by all 3 Galaxy-targeting pipelines.
- CWL-target tier: `summary-to-cwl-data-flow`, `summary-to-cwl-template`, `summarize-cwl-tool`, `implement-cwl-tool-step`, `implement-cwl-workflow-test`, `validate-cwl`, `run-workflow-test`, `debug-cwl-workflow-output` — used by 2 CWL-targeting pipelines.
- Tool-specific tier: `gxwf-cli`, `planemo-cli` — referenced by every pipeline indirectly through manual-page citations from per-action Molds; the whole-CLI cast is the standalone product.

## What this list is for

This list exists to **drive the Mold metadata schema**. Once we walk through 2-3 of these and see what each one actually needs to encode (typed references by kind: patterns, CLI manual pages, IO schemas, prompts, examples; dependencies on other Molds; evaluation hooks; casting hints), the schema falls out empirically. Suggested first walks, in priority order:

1. `summarize-paper` — most novel, most uncertain, exercises source-summarization shape and IO-schema reference.
2. `implement-galaxy-tool-step` — runs in inner loop, pulls heavily from pattern pages and corpus, exercises wiki-link resolution and condensation.
3. `validate-with-gxwf` — exercises CLI-manual-page reference, error-feedback loop; surfaces what a per-action Mold needs from a manpage cast.
4. `gxwf-cli` — exercises whole-CLI roll-up, manpage→JSON casting, the "structured runtime artifact" cast target.

After those four, the schema for a Mold should be obvious; spec time.
