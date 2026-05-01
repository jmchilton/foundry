# Pattern authorship policy

Project-level conventions for `content/patterns/` notes. Read by the IWC survey commands and by anyone hand-authoring a pattern page. Pattern-specific prescriptive rules (e.g. when to set `auto_col_types: true`) belong on the pattern page itself, not here.

## Naming: operation-anchored

Leaf pattern pages are named after the **operation** they describe, not the tool that implements it. Tool-anchored content is fine *inside* an operation-named page.

- ✅ `tabular-filter-by-regex.md` — operation; lists `tp_grep_tool` as the recommended tool, `Grep1` as a legacy footnote.
- ✅ `tabular-prepend-header.md` — operation; recipe is awk, but awk isn't in the title.
- ❌ `tp_grep_tool.md` — tool name in title.
- ❌ `awk-in-galaxy.md` — tool name in title; split into operation-named sub-pages instead.

Decided 2026-04-30 in the tabular survey (`content/research/iwc-tabular-operations-survey.md` §7). Applies to every pattern hierarchy going forward.

## Corpus-first

No exemplar in IWC, no pattern page. If the survey turns up an interesting capability with zero corpus uptake, document the gap as a one-line note in the survey — do not write a speculative pattern page.

This is what stops the foundry from accreting tool documentation that nobody actually reaches for in the wild.

## Legacy tools as footnotes

When the corpus shows a modern tool *and* a legacy alternative for the same operation (e.g. `datamash_ops` modern vs `Grouping1` legacy), the pattern page leads with the modern tool and footnotes the legacy with a "Legacy alternative" pointer. Reading old IWC workflows must stay possible; recommending old tools to new authors must not.

## Three places where authorship rules live

| Layer | What lives there | Example |
|---|---|---|
| `docs/PATTERNS.md` (this file) | Project-level authorship policy | "Operation-anchored naming" |
| `content/research/iwc-shortcuts-anti-patterns.md` | Corpus-grounded "don't do this" calls | "Don't reach for `Grep1` when `tp_grep_tool` is available" |
| The pattern page itself | Prescriptive per-pattern rules | `auto_col_types` per-expression-kind table on `tabular-compute-new-column` |

The IWC survey commands read all three before asking the user a question, so already-decided calls don't get re-litigated.
