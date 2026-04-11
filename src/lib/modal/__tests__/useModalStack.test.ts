import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { useModalStack } from '../useModalStack';

const CompA = defineComponent({ name: 'CompA', render: () => h('div', 'A') });
const CompB = defineComponent({ name: 'CompB', render: () => h('div', 'B') });
const CompC = defineComponent({ name: 'CompC', render: () => h('div', 'C') });

describe('useModalStack', () => {
  it('push appends and returns a unique id', () => {
    const s = useModalStack();
    const id1 = s.push(CompA);
    const id2 = s.push(CompB);
    expect(s.stack.value).toHaveLength(2);
    expect(id1).not.toBe(id2);
    expect(s.stack.value[0]).toMatchObject({ id: id1, component: CompA });
    expect(s.stack.value[1]).toMatchObject({ id: id2, component: CompB });
  });

  it('push passes props through', () => {
    const s = useModalStack();
    s.push(CompA, { foo: 'bar' });
    expect(s.stack.value[0].props).toEqual({ foo: 'bar' });
  });

  it('pop removes the top entry', () => {
    const s = useModalStack();
    s.push(CompA);
    s.push(CompB);
    s.pop();
    expect(s.stack.value).toHaveLength(1);
    expect(s.stack.value[0].component).toBe(CompA);
  });

  it('pop on empty stack is a no-op', () => {
    const s = useModalStack();
    expect(() => s.pop()).not.toThrow();
    expect(s.stack.value).toHaveLength(0);
  });

  it('replace swaps the top entry and returns new id', () => {
    const s = useModalStack();
    s.push(CompA);
    const idB = s.push(CompB);
    const idC = s.replace(CompC);
    expect(s.stack.value).toHaveLength(2);
    expect(s.stack.value[1].component).toBe(CompC);
    expect(idC).not.toBe(idB);
  });

  it('clear empties the stack', () => {
    const s = useModalStack();
    s.push(CompA);
    s.push(CompB);
    s.clear();
    expect(s.stack.value).toHaveLength(0);
  });

  it('remove deletes by id, preserving order', () => {
    const s = useModalStack();
    const idA = s.push(CompA);
    const idB = s.push(CompB);
    const idC = s.push(CompC);
    s.remove(idB);
    expect(s.stack.value.map((e) => e.id)).toEqual([idA, idC]);
  });

  it('ids are unique across instances', () => {
    const s1 = useModalStack();
    const s2 = useModalStack();
    const id1 = s1.push(CompA);
    const id2 = s2.push(CompA);
    expect(id1).not.toBe(id2);
  });
});
