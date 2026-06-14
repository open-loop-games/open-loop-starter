<!--
  MarkdownDoc — renders a markdown source string into the gallery detail
  pane. `marked` parses, `DOMPurify` sanitizes; we keep the surface boring
  on purpose.

  No syntax highlighting (no archetype doc relies on fenced code blocks
  today). Add `shiki` later if a doc surfaces one and the plain pre/code
  treatment isn't enough.

  `path` fields on manifests are dev-time monorepo-relative placeholders
  (see `src/types.ts` top-of-file note). The renderer keeps the existing
  inline-code style in the markdown source — links to those paths are not
  produced; the URL convention is deferred until hosting is decided.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const props = defineProps<{ source: string }>();

const html = computed(() => {
  const raw = marked.parse(props.source, { async: false });
  return DOMPurify.sanitize(raw as string);
});
</script>

<template>
  <article
    class="md-doc"
    v-html="html"
  />
</template>

<style>
.md-doc {
  line-height: 1.6;
  color: var(--color-text);
  font-family: var(--font-sans);
}
.md-doc h1 {
  font-size: 1.6rem;
  margin: 1.2rem 0 0.6rem;
}
.md-doc h2 {
  font-size: 1.2rem;
  margin: 1.4rem 0 0.5rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--color-border);
}
.md-doc h3 {
  font-size: 1rem;
  margin: 1.1rem 0 0.4rem;
  color: var(--color-text-muted);
}
.md-doc p,
.md-doc ul,
.md-doc ol {
  margin: 0.5rem 0;
}
.md-doc ul,
.md-doc ol {
  padding-left: 1.4rem;
}
.md-doc li {
  margin: 0.2rem 0;
}
.md-doc code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--color-surface);
  padding: 1px 5px;
  border-radius: 3px;
}
.md-doc pre {
  background: var(--color-surface);
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius);
  overflow-x: auto;
  font-size: 0.85em;
}
.md-doc pre code {
  background: transparent;
  padding: 0;
}
.md-doc blockquote {
  border-left: 3px solid var(--color-border);
  padding-left: 0.8rem;
  color: var(--color-text-muted);
}
.md-doc table {
  border-collapse: collapse;
  margin: 0.8rem 0;
}
.md-doc th,
.md-doc td {
  border: 1px solid var(--color-border);
  padding: 4px 8px;
  text-align: left;
}
.md-doc a {
  color: var(--color-primary);
}
</style>
