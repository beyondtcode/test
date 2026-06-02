/** Shared domain types for the testing platform */

export type CandidateSession = {
  id: string;
  candidateName: string;
  testId: string;
  startedAt: string;
  completedAt?: string;
};

export type TestDefinition = {
  id: string;
  title: string;
  durationMinutes: number;
};
