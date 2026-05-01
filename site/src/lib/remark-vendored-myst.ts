// Inline a vendored MyST-flavored markdown file into the page where a
// ```vendored-myst fence sits. The fence body is YAML with at minimum:
//
//   ```vendored-myst
//   file: <sibling-path>.upstream.myst
//   source: <upstream URL>
//   sha: <pinned commit>
//   ```
//
// `file` resolves relative to the markdown source. The vendored file is
// preprocessed (MyST admonitions + `(LABEL)=` anchors → HTML), then run
// through marked + marked-katex-extension for math rendering. The whole
// result replaces the fence as a single raw HTML node, so no MyST/math
// support leaks into the rest of the markdown pipeline.

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { visit } from "unist-util-visit";
import { Marked } from "marked";
import markedKatex from "marked-katex-extension";
import type { Root, Code, Html } from "mdast";
import type { VFile } from "vfile";

interface FenceMeta {
  file: string;
  source?: string;
  sha?: string;
}

const marked = new Marked();
marked.use(markedKatex({ throwOnError: false, output: "html" }));

function preprocessMyst(src: string): string {
  // (LABEL)= anchor markers — emit an empty anchor.
  let out = src.replace(/^\(([A-Za-z0-9_]+)\)=\s*$/gm, '<a id="$1"></a>');

  // MyST admonitions:
  //   :::{admonition} Title
  //   :class: note
  //
  //   body
  //   :::
  out = out.replace(
    /^:::\{admonition\}\s*(.*?)\s*\n(?::class:\s*(\S+)\s*\n)?\n?([\s\S]*?)\n:::\s*$/gm,
    (_m, title: string, cls: string | undefined, body: string) => {
      const klass = cls ? `admonition admonition-${cls}` : "admonition";
      const renderedTitle = title.trim() ? (marked.parseInline(title.trim()) as string) : "";
      const titleHtml = renderedTitle
        ? `<div class="admonition-title">${renderedTitle}</div>\n\n`
        : "";
      return `<aside class="${klass}">\n\n${titleHtml}${body.trim()}\n\n</aside>`;
    },
  );

  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

function parseFenceMeta(value: string): FenceMeta | null {
  let parsed: unknown;
  try {
    parsed = yaml.load(value);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const file = (parsed as Record<string, unknown>).file;
  if (typeof file !== "string" || !file) return null;
  const source = (parsed as Record<string, unknown>).source;
  const sha = (parsed as Record<string, unknown>).sha;
  return {
    file,
    source: typeof source === "string" ? source : undefined,
    sha: typeof sha === "string" ? sha : undefined,
  };
}

function provenanceHtml(meta: FenceMeta): string {
  if (!meta.source && !meta.sha) return "";
  const parts: string[] = [];
  if (meta.source) {
    parts.push(
      `<a href="${escapeHtml(meta.source)}" rel="noreferrer noopener">upstream source</a>`,
    );
  }
  if (meta.sha) parts.push(`pinned at <code>${escapeHtml(meta.sha)}</code>`);
  return `<div class="vendored-myst-provenance"><em>Vendored from ${parts.join(", ")}.</em></div>\n`;
}

export default function remarkVendoredMyst() {
  return function transformer(tree: Root, file: VFile) {
    const sourcePath = file.path ?? file.history[file.history.length - 1];
    if (!sourcePath) return;
    const sourceDir = path.dirname(sourcePath);

    visit(tree, "code", (node: Code, _index, _parent) => {
      if (node.lang !== "vendored-myst") return;
      const meta = parseFenceMeta(node.value);
      if (!meta) {
        replaceWithError(node, "vendored-myst: fence body must be YAML with a `file:` key");
        return;
      }
      const target = path.resolve(sourceDir, meta.file);
      let raw: string;
      try {
        raw = fs.readFileSync(target, "utf-8");
      } catch (err) {
        replaceWithError(node, `vendored-myst: cannot read ${meta.file}: ${(err as Error).message}`);
        return;
      }
      const preprocessed = preprocessMyst(raw);
      let body: string;
      try {
        body = marked.parse(preprocessed) as string;
      } catch (err) {
        replaceWithError(node, `vendored-myst: render failed: ${(err as Error).message}`);
        return;
      }
      const html =
        `<section class="vendored-myst" data-vendored-source="${escapeHtml(meta.source ?? "")}">\n` +
        provenanceHtml(meta) +
        body +
        `\n</section>`;
      const replacement = node as unknown as Html;
      replacement.type = "html";
      (replacement as Html).value = html;
      // Drop code-only fields.
      delete (replacement as { lang?: unknown }).lang;
      delete (replacement as { meta?: unknown }).meta;
    });
  };
}

function replaceWithError(node: Code, message: string) {
  const replacement = node as unknown as Html;
  replacement.type = "html";
  (replacement as Html).value =
    `<div class="vendored-myst-error" role="alert">${escapeHtml(message)}</div>`;
  delete (replacement as { lang?: unknown }).lang;
  delete (replacement as { meta?: unknown }).meta;
}
