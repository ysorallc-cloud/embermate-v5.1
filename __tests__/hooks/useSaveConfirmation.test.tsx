// ============================================================================
// useSaveConfirmation — F6 hook contract.
//
// Pins the Option-C guarantees directly on the extracted hook (the
// JournalNotesCard round-trip test exercises them through the component; this
// pins them at the source so any future consumer inherits a tested contract):
//
//   • justSaved flips true after a successful confirmSave, then resets after
//     holdMs.
//   • the reset is keyed to IDENTITY — changing identityKey clears justSaved;
//     re-rendering with the SAME identityKey (the savedText-echo analogue)
//     does NOT clear it. This is the bug class Option C closes.
//   • a rejected save shows no false confirmation (justSaved stays false) and
//     leaves saving false.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useSaveConfirmation, UseSaveConfirmation } from '../../hooks/useSaveConfirmation';

function harness(initial: { identityKey: string; holdMs?: number }) {
  const captured: { current: UseSaveConfirmation | null } = { current: null };
  function Probe(props: { identityKey: string; holdMs?: number }) {
    captured.current = useSaveConfirmation(props);
    return null;
  }
  let tree: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<Probe {...initial} />);
  });
  return {
    get: () => captured.current!,
    rerender: (p: { identityKey: string; holdMs?: number }) =>
      act(() => {
        tree.update(<Probe {...p} />);
      }),
    unmount: () => act(() => tree.unmount()),
  };
}

describe('useSaveConfirmation — F6 Option-C contract', () => {
  it('starts idle', () => {
    const h = harness({ identityKey: '2026-06-29' });
    expect(h.get().justSaved).toBe(false);
    expect(h.get().saving).toBe(false);
    h.unmount();
  });

  it('flips justSaved true after a successful confirmSave', async () => {
    const h = harness({ identityKey: '2026-06-29' });
    await act(async () => {
      await h.get().confirmSave(() => Promise.resolve());
    });
    expect(h.get().justSaved).toBe(true);
    expect(h.get().saving).toBe(false);
    h.unmount();
  });

  it('resets justSaved after holdMs', async () => {
    jest.useFakeTimers();
    try {
      const h = harness({ identityKey: '2026-06-29', holdMs: 3000 });
      await act(async () => {
        await h.get().confirmSave(() => Promise.resolve());
      });
      expect(h.get().justSaved).toBe(true);
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(h.get().justSaved).toBe(false);
      h.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it('a SAME-identity re-render does NOT clear justSaved (echo immunity)', async () => {
    const h = harness({ identityKey: '2026-06-29' });
    await act(async () => {
      await h.get().confirmSave(() => Promise.resolve());
    });
    expect(h.get().justSaved).toBe(true);
    // The post-save value echo re-renders the consumer with the SAME identity.
    h.rerender({ identityKey: '2026-06-29' });
    expect(h.get().justSaved).toBe(true);
    h.unmount();
  });

  it('an identity switch clears a stale confirmation', async () => {
    const h = harness({ identityKey: '2026-06-29' });
    await act(async () => {
      await h.get().confirmSave(() => Promise.resolve());
    });
    expect(h.get().justSaved).toBe(true);
    h.rerender({ identityKey: '2026-06-30' });
    expect(h.get().justSaved).toBe(false);
    h.unmount();
  });

  it('a rejected save shows no false confirmation', async () => {
    const h = harness({ identityKey: '2026-06-29' });
    await act(async () => {
      await h
        .get()
        .confirmSave(() => Promise.reject(new Error('write failed')))
        .catch(() => {});
    });
    expect(h.get().justSaved).toBe(false);
    expect(h.get().saving).toBe(false);
    h.unmount();
  });
});
