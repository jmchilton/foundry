# Initial Harness Pipelines

Initial sketch of harness pipelines for the Galaxy Workflow Foundry. Used to derive the initial Mold inventory: each named pipeline phase corresponds to one (atomic, harness-step-sized) Mold, and the union of phases across pipelines is the Mold catalog. See `MOLDS.md`.

These are sketches, not specs. Phase names are provisional. Phase counts and exact sequencing will shift as we work through real examples from the IWC corpus.

## Framing

- A **harness** is hand-authored orchestration glue. Harnesses sequence Molds, manage user-approval gates, and maintain run state. They are *not* cast from Molds and live outside the Foundry's casting pipeline. Some harnesses are heavyweight (Archon-style); some are simple orchestration skills.
- Each phase below is intended to be a **Mold** — atomic, cast from the Foundry, LLM-driven content, reusable across harnesses where the phase recurs.
- "atomic" means *atomic relative to harness pipeline phases*, not necessarily small. `summarize-nextflow` and `implement-tool-step` are both atomic at this tier even though they differ in LOC.

## CWL as intermediate (one option, not the path)

CWL is unofficially positioned as a **low-level, high-structure interchange format** — suitable as an intermediate target between an unstructured/loosely-structured source (a paper, a Nextflow pipeline) and Galaxy. The Foundry must support **both direct and composed paths** as first-class options:

- `PAPER → GALAXY` (direct) and `PAPER → CWL → GALAXY` (composed) are both valid.
- `NEXTFLOW → GALAXY` (direct) and `NEXTFLOW → CWL → GALAXY` (composed) are both valid.
- Direct paths are simpler to run and debug. Composed paths buy a structured checkpoint (CWL) at the cost of running two harnesses.
- Whether composition is reliable enough to *prefer* over direct is a longer-term research question. For now: both paths must be possible from the Mold inventory; the harness picks.

**Mold-inventory parity.** Source summarizers emit per-source schemas (paper, NF, CWL each different by design). Data flow is split by **target** (`summary-to-galaxy-data-flow`, `summary-to-cwl-data-flow`); each consumes any source summary, with the cast skill handling the polymorphism. This pushes complexity into the data-flow Molds rather than into a forced shared summary schema, and keeps direct/composed pipelines using the same Mold catalog.

## Harness-level concerns (not Molds)

Some recurring pipeline activities are **harness-level**, not Mold-shaped, and are therefore not in the Mold inventory. They are listed here so the boundary is visible.

- **Approval gates / scope confirmation / plan presentation.** Whether and when to pause for user confirmation (after planning, before authoring, after a partial cast) is a property of the harness's autonomy posture, not of any individual Mold. Different harnesses (interactive vs. batch vs. fully autonomous) want different gates around the same Molds; baking gates into Molds would either constrain that or duplicate logic. Harnesses own gates.
- **Tool-discovery routing.** "Try `discover-shed-tool` (find an existing wrapper via the Tool Shed); if nothing acceptable, fall through to `author-galaxy-tool-wrapper`" is a routing decision the harness makes; the two underlying capabilities are clean Molds. (`discover-shed-tool` is named for the *mechanism* — the Galaxy Tool Shed — leaving room for siblings like `discover-tool-via-galaxy-api` or `discover-tool-on-github` if other discovery paths get wrapped.)
- **State and resumption.** Persisting harness state across phases, resuming a partial run, and managing run history are harness concerns.

## Runtime tooling

The Foundry distinguishes:

- **Design time: `gxwf`** — workflow validation, tool discovery, schema, conversion. Used by Molds that author or validate workflow content.
- **Run time: Planemo** — executes Galaxy *and* CWL workflows. Used by `run-workflow-test`, `debug-galaxy-workflow-output`, `debug-cwl-workflow-output`.

### Validation posture: schema, not caveats

gxwf provides **static schema validation** for `gxformat2` workflows and tool steps that catches the failure modes prior-art skills (e.g., the existing `nf-to-galaxy` skill in `SKILLS_NF.md`) had to enumerate as prose caveats — UUID validity, tool-ID/owner/+galaxyN suffix mismatches, `input_connections` parameter-name mismatches, conditional-selector branches in `tool_state`, etc. The Foundry does **not** maintain a parallel "caveat catalog" of these failure modes; gxwf's schema is the source of truth and the validation loop is the enforcement mechanism.

This shifts the per-step loop from "author and hope" to **author → validate → fix** with validation running inline after each step is implemented, not only as a terminal phase. The pipelines below reflect this by invoking `validate-galaxy-step` (or `validate-cwl`) inside the per-step loop.

## Pipelines

Each pipeline is presented as an ordered list of phases. Phases marked `[loop]` run once per step in the workflow being constructed. Phases marked `[branch]` are harness-level routing — binary branches with fallthrough, or N-step fallback chains. They are *not* Molds; they reference Molds. The discover-or-author branch in Galaxy-targeting per-step loops is `[branch]` routing between two underlying capabilities.

Other inline phase annotations may be coined as needs surface — e.g., `[gate]` for an approval / scope-confirmation checkpoint that pauses for user input. None appear inline in the pipelines below today, so we don't pre-enumerate. `[branch]` and `[gate]` are unrelated behaviors; they don't share an umbrella tag.

### PAPER → GALAXY

1. `summarize-paper` — extract methods, named tools/algorithms, sample data, metrics, references to existing pipelines.
2. `summary-to-galaxy-data-flow` — abstract DAG with Galaxy-shaped collection / scatter / branching idioms surfaced.
3. `summary-to-galaxy-template` — `gxformat2` skeleton with per-step TODOs.
4. `compare-against-iwc-exemplar` — structural diff of the template against nearest IWC exemplar(s); flag divergences before sinking effort into per-step authoring.
5. `[loop]` `[branch]` discover-or-author branch:
   - try `discover-shed-tool`.
   - on fallthrough, `author-galaxy-tool-wrapper`.
6. `[loop]` `summarize-galaxy-tool` — pull JSON schema, containers, inputs/outputs for the resolved tool.
7. `[loop]` `implement-galaxy-tool-step` — convert abstract step to concrete `gxformat2` step.
8. `[loop]` `validate-galaxy-step` — schema-validate the just-implemented step; on red, the harness loops back to (7).
9. `[branch]` test-data resolution chain: try `paper-to-test-data` → on failure, `find-test-data` → on failure, harness gates to user-supplied data.
10. `implement-galaxy-workflow-test` — assemble test fixtures and assertions.
11. `validate-galaxy-workflow` — terminal schema/lint pass on the assembled workflow.
12. `run-workflow-test` — execute via Planemo.
13. `debug-galaxy-workflow-output` — triage failures, propose fixes.

### PAPER → CWL

1. `summarize-paper`
2. `summary-to-cwl-data-flow`
3. `summary-to-cwl-template` — CWL Workflow skeleton with per-step TODOs.
4. `[loop]` `summarize-cwl-tool` — derive a `CommandLineTool` description for each candidate (container, baseCommand, inputs/outputs).
5. `[loop]` `implement-cwl-tool-step` — concrete `CommandLineTool` and Workflow step.
6. `[loop]` `validate-cwl` — schema-validate the just-implemented step; on red, the harness loops back to (5).
7. `[branch]` test-data resolution chain: try `paper-to-test-data` → on failure, `find-test-data` → on failure, harness gates to user-supplied data.
8. `implement-cwl-workflow-test`
9. `validate-cwl` — terminal `cwltool --validate` / schema lint.
10. `run-workflow-test` — execute via Planemo.
11. `debug-cwl-workflow-output` — triage failures, propose fixes.

### NEXTFLOW → CWL

1. `summarize-nextflow` — enumerate processes, channels, conditionals, containers, test data; emit a structured summary (NF-specific schema).
2. `summary-to-cwl-data-flow`
3. `summary-to-cwl-template`
4. `[loop]` `summarize-cwl-tool`
5. `[loop]` `implement-cwl-tool-step`
6. `[loop]` `validate-cwl` — inline schema validation per step; loop back on red.
7. `nextflow-test-to-target-tests` — translate NF test data and expectations to the target's test format (here: CWL).
8. `validate-cwl` — terminal pass on the assembled workflow.
9. `run-workflow-test` — execute via Planemo.
10. `debug-cwl-workflow-output`

### NEXTFLOW → GALAXY

1. `summarize-nextflow`
2. `summary-to-galaxy-data-flow`
3. `summary-to-galaxy-template`
4. `compare-against-iwc-exemplar` — structural diff of the template against nearest IWC exemplar(s).
5. `[loop]` `[branch]` discover-or-author branch (`discover-shed-tool` → fallthrough to `author-galaxy-tool-wrapper`).
6. `[loop]` `summarize-galaxy-tool`
7. `[loop]` `implement-galaxy-tool-step`
8. `[loop]` `validate-galaxy-step` — inline schema validation per step; loop back on red.
9. `nextflow-test-to-target-tests` — target = Galaxy.
10. `implement-galaxy-workflow-test` — assemble test fixtures and assertions from the translated tests.
11. `validate-galaxy-workflow` — terminal pass on the assembled workflow.
12. `run-workflow-test` — execute via Planemo.
13. `debug-galaxy-workflow-output`

### CWL → GALAXY

CWL is already structured; the upstream extraction work is much lighter.

1. `summarize-cwl` — read CWL Workflow + referenced `CommandLineTool`s, identify inputs/outputs, scatter, conditional logic.
2. `summary-to-galaxy-data-flow` — re-shape into Galaxy-shaped data-flow idioms (collections, paired-collection semantics) from a CWL summary that's already nearly a DAG.
3. `summary-to-galaxy-template`
4. `compare-against-iwc-exemplar` — structural diff of the template against nearest IWC exemplar(s).
5. `[loop]` `[branch]` discover-or-author branch (`discover-shed-tool` → fallthrough to `author-galaxy-tool-wrapper`).
6. `[loop]` `summarize-galaxy-tool`
7. `[loop]` `implement-galaxy-tool-step`
8. `[loop]` `validate-galaxy-step` — inline schema validation per step; loop back on red.
9. `cwl-test-to-target-tests` — target = Galaxy.
10. `implement-galaxy-workflow-test` — assemble test fixtures and assertions from the translated tests.
11. `validate-galaxy-workflow` — terminal pass on the assembled workflow.
12. `run-workflow-test` — execute via Planemo.
13. `debug-galaxy-workflow-output`

## Cross-pipeline observations

- **Source-specific (one per source)**: `summarize-paper`, `summarize-nextflow`, `summarize-cwl`. Each emits its own schema by design.
- **Target-specific data-flow**: `summary-to-galaxy-data-flow`, `summary-to-cwl-data-flow`. Each consumes any source summary; the cast skill handles polymorphism.
- **Target-specific (one per target)**:
  - Templates: `summary-to-galaxy-template`, `summary-to-cwl-template`.
  - Per-step (Galaxy): `discover-shed-tool`, `summarize-galaxy-tool`, `author-galaxy-tool-wrapper`, `implement-galaxy-tool-step`.
  - Per-step (CWL): `summarize-cwl-tool`, `implement-cwl-tool-step`.
  - Validate: `validate-galaxy-step`, `validate-galaxy-workflow`, `validate-cwl`.
  - Debug: `debug-galaxy-workflow-output`, `debug-cwl-workflow-output`.
- **Cross-target (Planemo-backed)**: `run-workflow-test`.
- **Source × target (test translation)**: `nextflow-test-to-target-tests`, `cwl-test-to-target-tests`. May or may not factor cleanly into a single `<source>-test-to-<target>-tests` Mold family vs. a per-pair Mold; defer.
- **Test data extraction (source-specific, target-agnostic)**: `paper-to-test-data` is its own thing because a paper rarely ships a test bundle the way NF/CWL pipelines do.

## Pattern pages, not Molds

Per the architecture, the `design-*` knowledge skills (collection manipulation, tabular manipulation, conditional handling, …) are **Foundry pattern pages**, not Molds. They are wiki-linked from action Molds (especially `implement-galaxy-tool-step` and `summary-to-galaxy-template`) and pulled into cast skills via casting's link resolution.

Custom-Galaxy-tool authoring is split: a **pattern page** (reference and guidance) plus a companion **action Mold** (`author-galaxy-tool-wrapper`) that performs the authoring. The Mold links to the pattern page; the pattern page is consumed by the Mold's cast skill via link resolution.

## Open questions

- Whether to surface `PAPER → CWL → GALAXY` and `NEXTFLOW → CWL → GALAXY` as distinct named harnesses or leave them as runtime compositions of two harnesses. (Either way the Mold inventory is unchanged — both paths reuse existing Molds.)
- Whether `compare-against-iwc-exemplar` should also fire post-implementation (after the per-step loop) in addition to its post-template position, to catch divergences that only appear at full step granularity.
- Whether `run-workflow-test` factors cleanly across Galaxy and CWL targets via Planemo, or splits into per-target variants once we hit real test execution.
- Whether the `<source>-test-to-<target>-tests` Molds factor through a shared intermediate or stay per-pair.
