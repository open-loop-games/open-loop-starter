import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EventLog from '../EventLog.vue';
import type { EventLine } from '../EventLog';

const line = (seq: number, kind = 'plain'): EventLine => ({
  seq,
  at: seq * 10,
  kind,
  text: `line ${seq}`,
});
const lines = [line(1), line(2, 'warn'), line(3)];
const texts = (w: ReturnType<typeof mount>) => w.findAll('.event-log__text').map((t) => t.text());

describe('EventLog', () => {
  it('draws the newest first by default, kinded, the newest marked fresh', () => {
    const w = mount(EventLog, { props: { lines } });
    expect(texts(w)).toEqual(['line 3', 'line 2', 'line 1']);
    expect(w.findAll('.event-log__row--warn')).toHaveLength(1);
    expect(w.find('.event-log__row--fresh').text()).toBe('line 3');
  });

  it('keeps the newest lines up to the limit, in chronological order on request', () => {
    const w = mount(EventLog, { props: { lines, limit: 2, order: 'chronological' } });
    expect(texts(w)).toEqual(['line 2', 'line 3']);
  });

  it('draws a time column only when given a formatter', () => {
    expect(mount(EventLog, { props: { lines } }).find('.event-log__time').exists()).toBe(false);
    const w = mount(EventLog, { props: { lines, formatTime: (at: number) => `${at}s` } });
    expect(w.find('.event-log__time').text()).toBe('30s');
  });

  it('shows an empty state, which a slot can replace', () => {
    expect(
      mount(EventLog, { props: { lines: [] } })
        .find('.event-log__empty')
        .exists(),
    ).toBe(true);
    const w = mount(EventLog, { props: { lines: [] }, slots: { empty: 'All quiet.' } });
    expect(w.find('.event-log__empty').text()).toBe('All quiet.');
  });

  it('draws nothing for an empty log when told not to show the empty state', () => {
    const w = mount(EventLog, { props: { lines: [], showEmpty: false } });
    expect(w.find('.event-log__empty').exists()).toBe(false);
  });

  it('announces new lines politely, unless the story says otherwise', () => {
    expect(mount(EventLog, { props: { lines } }).attributes('aria-live')).toBe('polite');
    const w = mount(EventLog, { props: { lines }, attrs: { 'aria-live': 'off' } });
    expect(w.attributes('aria-live')).toBe('off');
  });

  it('hands a row slot the line and whether it is fresh', () => {
    const w = mount(EventLog, {
      props: { lines },
      slots: {
        row: `<template #row="{ line, fresh }"><b>{{ line.seq }}{{ fresh ? '*' : '' }}</b></template>`,
      },
    });
    expect(w.findAll('b').map((b) => b.text())).toEqual(['3*', '2', '1']);
  });
});
