import type { Phase, PhaseGroup, ProgramLength } from '@/types/workout';

type PhaseRange = {
  endWeek: number;
  phase: Phase;
};

const PHASE_RANGES: Record<PhaseGroup, Record<ProgramLength, PhaseRange[]>> = {
  bench: {
    8: [
      { endWeek: 1, phase: 'Phase I' },
      { endWeek: 3, phase: 'Phase II' },
      { endWeek: 5, phase: 'Phase III' },
      { endWeek: 8, phase: 'Peak Phase' },
    ],
    10: [
      { endWeek: 2, phase: 'Phase I' },
      { endWeek: 5, phase: 'Phase II' },
      { endWeek: 8, phase: 'Phase III' },
      { endWeek: 10, phase: 'Peak Phase' },
    ],
  },
  lower: {
    8: [
      { endWeek: 1, phase: 'Phase I' },
      { endWeek: 3, phase: 'Phase II' },
      { endWeek: 5, phase: 'Phase III' },
      { endWeek: 8, phase: 'Peak Phase' },
    ],
    10: [
      { endWeek: 2, phase: 'Phase I' },
      { endWeek: 4, phase: 'Phase II' },
      { endWeek: 7, phase: 'Phase III' },
      { endWeek: 10, phase: 'Peak Phase' },
    ],
  },
};

export const SUPPORTED_PROGRAM_LENGTHS: ProgramLength[] = [8, 10];

export function getPhaseForWeek(week: number, weeks: ProgramLength, group: PhaseGroup): Phase {
  const ranges = PHASE_RANGES[group][weeks];
  const matchingRange = ranges.find((range) => week <= range.endWeek);

  return matchingRange?.phase ?? 'Peak Phase';
}
