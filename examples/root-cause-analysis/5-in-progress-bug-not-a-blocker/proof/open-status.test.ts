import { describe, expect, it } from 'vitest';
import { isOpen } from '../src/domain/findings';
import { captureEvidence } from '../src/domain/release';
import { seed } from '../src/data/fixtures';
import type { Finding, FindingStatus } from '../src/domain/types';

const at = '2026-01-01T10:00:00.000Z';
const f = (status: FindingStatus): Finding => ({ id: 'X', type: 'bug', projectId: 'og', title: 't', status, reporterId: 'u', createdAt: at, updatedAt: at, severity: 'critical' });

describe('which findings count as unresolved', () => {
  it.each([['draft', false], ['open', true], ['in_progress', true], ['resolved', false], ['closed', false]] as [FindingStatus, boolean][])('isOpen(%s) is %s', (status, expected) => {
    expect(isOpen(f(status))).toBe(expected);
  });

  it('an in-progress critical bug is a release blocker', () => {
    const s = seed();
    const ev = captureEvidence([], s.findings, 'og', at);
    expect(ev.blockers.map((b) => b.id)).toContain('CP-104');
  });
});
