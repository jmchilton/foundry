# summary-to-galaxy-template eval

## Case: data-flow draft to gxformat2 skeleton

- check: llm-judged
- fixture: Galaxy data-flow draft with workflow inputs, outputs, abstract nodes, edges, and at least one collection-shaped connection.
- expectation: emits a gxformat2 skeleton that preserves intended topology, labels unresolved steps clearly, and does not resolve concrete tool metadata prematurely.

## Case: placeholder transformation handoff

- check: llm-judged
- fixture: data-flow draft with a collection cleanup, identifier synchronization, Apply Rules reshape, tabular bridge, or optional-output route.
- expectation: renders the transformation as an explicit placeholder or TODO step with enough shape and evidence context for the later implementation mold.

## Case: exemplar comparison preparation

- check: llm-judged
- fixture: gxformat2 skeleton with enough domain, input topology, tool-family, and output signal to choose IWC exemplars.
- expectation: records candidate exemplar-selection features and cites the patterns or research notes that should guide compare-against-IWC work.

## Case: pattern capture from evaluation run

- check: llm-judged
- fixture: any real template-generation run that exposes a reusable skeleton idiom, awkward placeholder, missing pattern, or unclear mold boundary.
- expectation: records how the observation should be captured: new or revised pattern note, research issue, schema/eval update, mold-reference update, or documentation task; includes concrete evidence required to verify it.

## Case: failure surface preservation

- check: llm-judged
- fixture: gxformat2 skeleton with unresolved tool placeholders, workflow outputs, collection outputs, and at least one conditional or optional path.
- expectation: preserves labels, outputs, and TODO context needed to trace later Planemo failures back to tool/job state, workflow invocation state, or assertion/output mismatch without relying only on terminal logs.
