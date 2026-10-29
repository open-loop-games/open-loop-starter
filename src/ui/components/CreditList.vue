<!--
  CreditList — the game's credits: what each sourced asset is, who made it, and
  its license. A game keeps its credits as data (`GameCredit[]`) and hands them
  to SystemHeader, which shows them in its About popover; mount this directly to
  show them anywhere else. Renders nothing for an empty list.

  Write each credit the way its license asks: some licenses name the exact
  wording, and `by` is where it goes.

  Costume classes (stable API) — renames are breaking:
    .olui-credit-list            the section
    .olui-credit-list__heading   its heading
    .olui-credit-list__item      one credit
    .olui-credit-list__what      what the credit covers
    .olui-credit-list__by        who made it; a link when the credit has a url
    .olui-credit-list__license   the license's short name
  Custom props: --credit-list-{rule,muted}.
-->
<script setup lang="ts">
export interface GameCredit {
  /** What the game uses, in the player's words: "City models", "Display font". */
  what: string;
  /** Who made it, worded as the license asks to be credited. */
  by: string;
  /** Where the source is published; makes `by` a link. */
  url?: string;
  /** The license's short name: "CC0", "SIL OFL 1.1", "Purchased license". */
  license: string;
}

withDefaults(defineProps<{ credits: GameCredit[]; heading?: string }>(), {
  heading: 'Credits',
});
</script>

<template>
  <section v-if="credits.length" class="olui-credit-list">
    <h5 class="olui-credit-list__heading">{{ heading }}</h5>
    <ul>
      <li v-for="(c, i) in credits" :key="i" class="olui-credit-list__item">
        <span class="olui-credit-list__what">{{ c.what }}</span>
        <a
          v-if="c.url"
          class="olui-credit-list__by"
          :href="c.url"
          target="_blank"
          rel="noopener noreferrer"
          >{{ c.by }}</a
        >
        <span v-else class="olui-credit-list__by">{{ c.by }}</span>
        <span class="olui-credit-list__license">{{ c.license }}</span>
      </li>
    </ul>
  </section>
</template>

<style>
/* Unscoped and one class deep: the list renders in a portal, and a costume rule wins. */
.olui-credit-list {
  --_credit-list-rule: var(--credit-list-rule, var(--color-border));
  --_credit-list-muted: var(--credit-list-muted, var(--color-text-muted));

  margin-top: var(--gap-sm);
  padding-top: var(--gap-sm);
  border-top: 1px solid var(--_credit-list-rule);
  font-size: 0.85em;
}

.olui-credit-list__heading {
  margin: 0 0 4px;
  font: inherit;
  font-weight: 600;
  color: var(--_credit-list-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.85em;
}

.olui-credit-list ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Each credit reads as one line of prose; a wrapped line hangs under its first. */
.olui-credit-list__item {
  padding-left: 1em;
  text-indent: -1em;
  line-height: 1.4;
}

.olui-credit-list__what::after {
  content: ': ';
}

.olui-credit-list__by {
  color: inherit;
}

.olui-credit-list__license {
  color: var(--_credit-list-muted);
  white-space: nowrap;
}

.olui-credit-list__license::before {
  content: ' · ';
}
</style>
