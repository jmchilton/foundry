import { describe, expect, it } from "vitest";
import { resolveWikiLink, slugify, stripBrackets } from "../scripts/lib/wiki-links.js";

describe("slugify", () => {
  it("lowercases and replaces spaces", () => {
    expect(slugify("Foo Bar")).toBe("foo-bar");
  });
  it("collapses dashes around spaces", () => {
    expect(slugify("Foo  -  Bar")).toBe("foo-bar");
  });
  it("strips non-alnum-dash", () => {
    expect(slugify("Foo (bar)?")).toBe("foo-bar");
  });
  it("collapses repeated dashes", () => {
    expect(slugify("foo---bar")).toBe("foo-bar");
  });
});

describe("stripBrackets", () => {
  it("returns inner text", () => {
    expect(stripBrackets("[[Foo]]")).toBe("Foo");
  });
  it("returns null for non-wiki-link", () => {
    expect(stripBrackets("plain")).toBeNull();
  });
  it("returns null for non-string", () => {
    expect(stripBrackets(42)).toBeNull();
  });
});

describe("resolveWikiLink", () => {
  const slugMap = new Map([
    ["foo", "/notes/foo.md"],
    ["foo-bar", "/notes/foo-bar.md"],
    ["foo-bar-baz", "/notes/foo-bar-baz.md"],
  ]);

  it("exact match wins", () => {
    expect(resolveWikiLink("[[foo]]", slugMap)).toBe("/notes/foo.md");
  });
  it("prefix match falls back", () => {
    expect(resolveWikiLink("[[foo-b]]", slugMap)).toBe("/notes/foo-bar.md");
  });
  it("longest prefix wins (deterministic)", () => {
    expect(resolveWikiLink("[[foo-bar]]", slugMap)).toBe("/notes/foo-bar.md");
  });
  it("returns null when nothing matches", () => {
    expect(resolveWikiLink("[[zzz]]", slugMap)).toBeNull();
  });
});
