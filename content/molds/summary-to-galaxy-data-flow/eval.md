# summary-to-galaxy-data-flow eval

## Case: source-shape to Galaxy topology

- check: llm-judged
- fixture: Nextflow summary with at least one non-scalar channel shape, such as paired reads, grouped tuples, mixed optional outputs, or nested collections.
- expectation: produces a Galaxy-facing data-flow draft that records the chosen dataset or collection shape, confidence, and rationale for each non-trivial source shape.

## Case: operator-derived transformation

- check: llm-judged
- fixture: Nextflow summary with at least one channel operator that changes topology or routing, such as `map`, `join`, `groupTuple`, `branch`, `mix`, `combine`, or `multiMap`.
- expectation: classifies each operator-derived decision as direct wiring, Galaxy collection semantics, explicit Galaxy step, or user-review item, and cites the research or pattern note used.

## Case: pattern capture from evaluation run

- check: llm-judged
- fixture: any real translation run that surfaces a repeated or reusable Galaxy data-flow decision.
- expectation: records whether the decision should become a pattern note, research note, schema change, mold-reference change, or issue; includes evidence needed to research, verify, and document it.

## Case: unresolved translation boundary

- check: llm-judged
- fixture: data-flow draft with at least one uncertain tool need, placeholder transformation, conditional branch, collection reshape, or tabular bridge.
- expectation: assigns ownership to data-flow, template, concrete step implementation, or follow-up research; does not hide unresolved semantics in prose-only TODOs.
