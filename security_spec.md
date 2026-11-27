# Security Specification & Payload-First TDD — Inducción SENA

## 1. Data Invariants
1. **Identity Ownership**: Every `users/{userId}`, `evaluations/{evalId}`, and `sensitization_sessions/{sessionId}/responses/{responseId}` write must have `uid == request.auth.uid` and `email_verified == true`.
2. **No Self-Assigned Privileges**: Non-admin users cannot create a profile with `role == 'instructor'`, escalate their own `role` during updates, or write to `/admins/{adminId}`.
3. **Immutable Audit Fields**: `createdAt`, `uid`, `instructorUid`, and `sessionCode` are immutable after creation; all `createdAt` / `updatedAt` timestamps must strictly equal `request.time`.
4. **Master Gate & Terminal State Locking**: Responses under `/sensitization_sessions/{sessionId}/responses/{responseId}` require an existing parent session with `status == 'activa'` and matching `instructorUid`. Once a session reaches `status == 'finalizada'`, normal updates are locked.
5. **Query Isolation**: Every `allow list` rule validates `resource.data` directly without `get()` or `exists()` lookups.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unverified Email Spoof**: Write to `/users/u1` with `email_verified: false` -> `PERMISSION_DENIED`.
2. **Self-Assigned Instructor Escalation**: Create `/users/u1` with `role: "instructor"` as regular user -> `PERMISSION_DENIED`.
3. **Profile Role Tampering**: Update `/users/u1` changing `role` from `"aprendiz"` to `"instructor"` -> `PERMISSION_DENIED`.
4. **Ghost Field Injection (Shadow Update)**: Update `/users/u1` including extra key `isVerified: true` -> `PERMISSION_DENIED`.
5. **Oversized ID Poisoning**: Create `/evaluations/{1500_char_id}` -> `PERMISSION_DENIED`.
6. **Score Tampering**: Create `/evaluations/e1` with `totalScore: 150` or `correctCount > questionCount` -> `PERMISSION_DENIED`.
7. **Evaluation Immutability Bypass**: Update an existing `/evaluations/e1` -> `PERMISSION_DENIED`.
8. **Backdated Timestamp**: Create `/evaluations/e1` with client-supplied past `createdAt` -> `PERMISSION_DENIED`.
9. **Unauthorized Session Creation**: Non-admin creates `/sensitization_sessions/SENA26` -> `PERMISSION_DENIED`.
10. **Orphaned Response Write**: Create response under non-existent `/sensitization_sessions/FAKE99/responses/r1` -> `PERMISSION_DENIED`.
11. **Closed Session Write**: Create or update response when parent session `status == "finalizada"` -> `PERMISSION_DENIED`.
12. **Cross-User Response Spoof / List Scraping**: Apprentice attempts to `list` `/evaluations` or `/responses` belonging to another `uid` -> `PERMISSION_DENIED`.
