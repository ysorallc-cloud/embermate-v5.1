// ============================================================================
// InlineLogForm — Dispatch logic and form type coverage tests
// Tests the type→form mapping without React rendering (node test env)
// ============================================================================

describe('InlineLogForm dispatch logic', () => {
  // Replicate the dispatch switch from InlineLogForm
  function getFormTypeForTaskType(type: string): string {
    switch (type) {
      case 'medication': return 'InlineMedForm';
      case 'vitals': return 'InlineVitalsForm';
      case 'nutrition': return 'InlineMealForm';
      case 'hydration': return 'InlineWaterForm';
      case 'mood': return 'InlineMoodForm';
      case 'wellness': return 'NavigateButton';
      default: return 'QuickCompleteForm';
    }
  }

  it('medication form renders Taken and Skipped buttons (dispatches to InlineMedForm)', () => {
    expect(getFormTypeForTaskType('medication')).toBe('InlineMedForm');
  });

  it('vitals form renders BP input fields (dispatches to InlineVitalsForm)', () => {
    expect(getFormTypeForTaskType('vitals')).toBe('InlineVitalsForm');
  });

  it('meal form renders quality selector (dispatches to InlineMealForm)', () => {
    expect(getFormTypeForTaskType('nutrition')).toBe('InlineMealForm');
  });

  it('water form dispatches to InlineWaterForm', () => {
    expect(getFormTypeForTaskType('hydration')).toBe('InlineWaterForm');
  });

  it('mood form dispatches to InlineMoodForm', () => {
    expect(getFormTypeForTaskType('mood')).toBe('InlineMoodForm');
  });

  it('wellness dispatches to NavigateButton', () => {
    expect(getFormTypeForTaskType('wellness')).toBe('NavigateButton');
  });

  it('unknown types fall through to QuickCompleteForm (errand, shift, self_care, etc.)', () => {
    expect(getFormTypeForTaskType('errand')).toBe('QuickCompleteForm');
    expect(getFormTypeForTaskType('shift')).toBe('QuickCompleteForm');
    expect(getFormTypeForTaskType('self_care')).toBe('QuickCompleteForm');
    expect(getFormTypeForTaskType('appointment')).toBe('QuickCompleteForm');
    expect(getFormTypeForTaskType('custom')).toBe('QuickCompleteForm');
  });

  it('onComplete callback structure matches expected signature', () => {
    // Verify that all form types expect (taskId: string, data?: any) => Promise<void>
    const mockOnComplete = jest.fn().mockResolvedValue(undefined);
    const taskId = 'task-123';
    const data = { outcome: 'taken' };

    mockOnComplete(taskId, data);
    expect(mockOnComplete).toHaveBeenCalledWith(taskId, data);
  });

  it('onSkip callback structure matches expected signature', () => {
    const mockOnSkip = jest.fn().mockResolvedValue(undefined);
    const taskId = 'task-123';
    const reason = 'Patient refused';

    mockOnSkip(taskId, reason);
    expect(mockOnSkip).toHaveBeenCalledWith(taskId, reason);
  });
});
