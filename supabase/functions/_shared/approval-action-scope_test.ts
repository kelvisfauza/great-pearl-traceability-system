import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { approvalActionAllowed } from './approval-action-scope.ts';

Deno.test('approval capability cannot be used for rejection or another operation', () => {
  assertEquals(approvalActionAllowed('POST', 'approve', 'approve'), true);
  assertEquals(approvalActionAllowed('POST', 'reject', 'approve'), false);
  assertEquals(approvalActionAllowed('POST', 'approve', 'reject'), false);
  assertEquals(approvalActionAllowed('GET', 'approve', 'approve'), false);
  assertEquals(approvalActionAllowed('POST', 'other', 'other'), false);
});