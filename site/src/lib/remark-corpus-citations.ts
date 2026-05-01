// Rewrites `$NAME/path:line` corpus citations (inside inline code) into
// links to the upstream GitHub repo when `common_paths.yml` declares a
// `repo` for the citation prefix. Citations whose prefix has no `repo`
// are left as plain inline code.
//
// See `common_paths.yml.sample` at the repo root for the citation grammar.

import path from "node:path";
import { visit, SKIP } from "unist-util-visit";
import type { Root, InlineCode, PhrasingContent } from "mdast";
import {
  loadCommonPaths,
  parseCitation,
  citationGithubUrl,
  type CommonPaths,
} from "../../../scripts/lib/common-paths.ts";

interface Options {
  repoRoot: string;
}

export default function remarkCorpusCitations(opts: Options) {
  let cache: CommonPaths | null = null;
  const getPaths = () => (cache ??= loadCommonPaths(path.resolve(opts.repoRoot)));

  return function transformer(tree: Root) {
    const paths = getPaths();
    if (Object.keys(paths).length === 0) return;

    visit(tree, "inlineCode", (node: InlineCode, index, parent) => {
      if (!parent || index === undefined) return;
      if (parent.type === "link") return; // already linked
      const citation = parseCitation(node.value, paths);
      if (!citation) return;
      const url = citationGithubUrl(citation);
      if (!url) return; // entry has no repo — render as plain code

      const replacement: PhrasingContent = {
        type: "link",
        url,
        title: null,
        children: [node],
      };
      (parent.children as PhrasingContent[]).splice(index, 1, replacement);
      return [SKIP, index + 1];
    });
  };
}
