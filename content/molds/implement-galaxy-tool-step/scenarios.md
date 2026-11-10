# implement-galaxy-tool-step scenarios

## Case: concrete step preserves failure evidence

- fixture: abstract step plus Galaxy tool summary where the wrapper defines exit-code, stdio regex, strict-shell, or dynamic output behavior.
- expect: implements the step without erasing failure evidence needed later, including tool id, input labels, output labels, collection shape, and any wrapper failure semantics relevant to runtime debugging.

## Case: runtime failure ownership hint

- fixture: concrete step implementation whose wrapper carries what the plan needs, with a plausible runtime mismatch between expected source behavior and the wrapper's datatype, parameter, or collection support.
- expect: records whether a later failure should be investigated as tool/job failure, data-flow mistake, template wiring mistake, wrapper mismatch, or test/assertion issue.

## Case: wrapper runs the work but has no index output

- fixture: `../repair-galaxy-draft-topology/examples/star-index-fold/galaxy-workflow-draft.gxwf.yml`, step `star_genome_index`, with the [[galaxy-tool-summary]] from `galaxy-tool-cache summarize toolshed.g2.bx.psu.edu/repos/iuc/rgrnastar/rna_star --tool-version 2.7.11b+galaxy1`. That wrapper has no index output: with `geneSource: history` it builds a temporary index inside the alignment job.
- expect: `TODO_index` stays unbound. One open blocking entry with `step: star_genome_index` names `rna_star` `2.7.11b+galaxy1` in `missing` and quotes its outputs and the `geneSource` option, as in `open-requirements.ledger.yml` beside the draft. Nothing asks for a new STAR wrapper.

## Case: step bound to an authored user-defined tool

- fixture: a draft with one Deferred step (`tool_id: TODO`, `TODO_*` ports, `_plan_*` fields) whose Tool Shed discovery missed, plus the `galaxy-user-tool.yml` [[author-galaxy-tool-wrapper]] emitted for it. The definition embedded in Galaxy's `$GALAXY/lib/galaxy_test/workflow/inline_user_defined_tool.gxwf.yml` can stand in for the authored file once its data input's `format` is written as a list (`[txt]`), as [[author-galaxy-tool-wrapper]] emits it.
- expect: the implemented step carries that definition under `run:`, unchanged from the authored file, has no `tool_id`, `tool_version`, `tool_shed_repository`, or `tool_uuid`, keys `in:` by the definition's input names, and lists under `out:` every output a downstream step or workflow output uses. `gxwf draft-validate` without `--concrete` exits 0, and the workflow `gxwf draft-extract` writes keeps every workflow output and downstream connection of the implemented step. With a gxwf that still crashes on embedded steps, the run records in the ledger that `--concrete` validation did not run, rather than reporting the crash as a step failure. With a fixed gxwf pinned, `--concrete` exits 0 instead.
