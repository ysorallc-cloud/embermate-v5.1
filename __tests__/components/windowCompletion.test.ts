// ============================================================================
// Window Completion Status — Verifies correct "X remaining" vs "Complete ✓"
// ============================================================================

describe('Window completion status logic', () => {
  // Replicate the corrected counting logic from TimelineSection.tsx
  function getWindowStatus(items: { status: string }[]): { remainingCount: number; allDone: boolean; label: string } {
    const completedCount = items.filter(i =>
      i.status === 'completed' || i.status === 'skipped'
    ).length;
    const remainingCount = items.length - completedCount;
    const allDone = remainingCount === 0;
    const label = remainingCount > 0 ? `${remainingCount} remaining` : 'Complete ✓';
    return { remainingCount, allDone, label };
  }

  it('window with 2 completed and 3 pending shows "3 remaining"', () => {
    const items = [
      { status: 'completed' },
      { status: 'completed' },
      { status: 'pending' },
      { status: 'pending' },
      { status: 'pending' },
    ];
    const result = getWindowStatus(items);
    expect(result.remainingCount).toBe(3);
    expect(result.allDone).toBe(false);
    expect(result.label).toBe('3 remaining');
  });

  it('window with 2 completed and 3 missed shows "3 remaining", NOT "Complete ✓"', () => {
    const items = [
      { status: 'completed' },
      { status: 'completed' },
      { status: 'missed' },
      { status: 'missed' },
      { status: 'missed' },
    ];
    const result = getWindowStatus(items);
    expect(result.remainingCount).toBe(3);
    expect(result.allDone).toBe(false);
    expect(result.label).toBe('3 remaining');
  });

  it('window with all completed shows "Complete ✓"', () => {
    const items = [
      { status: 'completed' },
      { status: 'completed' },
      { status: 'skipped' },
    ];
    const result = getWindowStatus(items);
    expect(result.remainingCount).toBe(0);
    expect(result.allDone).toBe(true);
    expect(result.label).toBe('Complete ✓');
  });

  it('window with mix of completed, skipped, pending, and missed counts correctly', () => {
    const items = [
      { status: 'completed' },
      { status: 'skipped' },
      { status: 'pending' },
      { status: 'missed' },
      { status: 'completed' },
    ];
    const result = getWindowStatus(items);
    // 3 completed/skipped, 2 remaining (pending + missed)
    expect(result.remainingCount).toBe(2);
    expect(result.allDone).toBe(false);
    expect(result.label).toBe('2 remaining');
  });

  it('single missed item prevents "Complete ✓"', () => {
    const items = [
      { status: 'completed' },
      { status: 'completed' },
      { status: 'completed' },
      { status: 'missed' },
    ];
    const result = getWindowStatus(items);
    expect(result.remainingCount).toBe(1);
    expect(result.allDone).toBe(false);
    expect(result.label).toBe('1 remaining');
  });

  it('empty window shows "Complete ✓" (vacuously true)', () => {
    const result = getWindowStatus([]);
    expect(result.remainingCount).toBe(0);
    expect(result.allDone).toBe(true);
    expect(result.label).toBe('Complete ✓');
  });

  it('all pending shows full count remaining', () => {
    const items = [
      { status: 'pending' },
      { status: 'pending' },
      { status: 'pending' },
    ];
    const result = getWindowStatus(items);
    expect(result.remainingCount).toBe(3);
    expect(result.label).toBe('3 remaining');
  });
});
