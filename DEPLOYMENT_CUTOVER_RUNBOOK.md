# Deployment and cutover runbook

This runbook covers the Identity, secure-session, and MinIO media cutover. Run it first against a staging copy of production. Record the operator, UTC timestamp, command output, row counts, checksums, and approval for every checkpoint.

## 1. Preconditions and ownership

- Assign one release owner, one database owner, and one rollback decision maker.
- Define the maintenance window, canary audience, rollback deadline, and the agreed legacy-media retention period.
- Confirm the target environment provides HTTPS from browser to reverse proxy and forwards the original scheme to the API.
- Confirm production CORS contains only approved frontend origins and never uses a wildcard with credentials.
- Confirm the MinIO bucket is private and no access key, secret key, connection string, password, reset token, cookie, or presigned URL is written to logs.
- Keep `imageAPI` and the legacy media directory read-only and recoverable until the rollback period ends.

## 2. Back up and prove recovery

1. Stop scheduled imports and other nonessential writers.
2. Create a full SQL backup and record its location, size, timestamp, and integrity-check result.
3. Create a filesystem-level backup or immutable snapshot of all legacy media, preserving relative paths and timestamps.
4. Export the pre-cutover database row counts for users, roles, role membership, bachelors, and legacy media references.
5. Restore the SQL backup and a sample of the media backup into an isolated environment. Do not proceed until the restore is usable.

Rollback checkpoint: retain the verified SQL backup, media snapshot, application images, and configuration from the last known-good release.

## 3. Rotate and configure secrets

Rotate every credential that has ever appeared in source control, including:

- SQL credentials.
- MinIO access and secret keys.
- SMTP credentials.
- ElevenLabs API keys.
- Any cookie-signing, service, or deployment credentials that may have shared the same secret.

Store production values only in the deployment platform's secret manager or protected environment. Configure SQL, SMTP, MinIO, CORS, public frontend origin, and cookie settings from those values. Verify that production authentication uses the `__Host-` cookie prefix, `Secure`, `HttpOnly`, `Path=/`, and an appropriate `SameSite` value.

Run the repository secret scan before deployment:

```powershell
cd fe
bun run secrets:check
```

## 4. Quality gates and image preparation

Run from a clean checkout of the release commit:

```powershell
cd fe
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun test
bun run secrets:check
bun run build

cd ..\be
dotnet restore FA23_Convocation2023_API.sln
dotnet build FA23_Convocation2023_API.sln --configuration Release --no-restore
dotnet test FA23_Convocation2023_API.sln --configuration Release --no-build

cd ..
docker compose config --quiet
docker compose build be fe
```

Record immutable image digests. Confirm the API does not start accepting traffic until SQL and MinIO are reachable and the private bucket is ready.

## 5. Staging migration rehearsal

1. Restore a recent production SQL backup and the matching legacy media snapshot into staging.
2. Start SQL and MinIO with production-equivalent policies and limits.
3. Run the backend's Identity migration/startup flow against the staging copy.
4. Run the media discovery without writes:

   ```powershell
   dotnet run --project be/FA23_Convocation2023_API.csproj -- --migrate-media --dry-run
   ```

5. Review every rejected path, symlink, unsupported file, duplicate, and missing reference. Resolve or explicitly approve each exception.
6. Run the real staging migration:

   ```powershell
   dotnet run --project be/FA23_Convocation2023_API.csproj -- --migrate-media
   ```

7. Compare discovered, migrated, skipped, and failed counts. Match source SHA-256 values to `MediaAsset`/`LegacyMediaMapping` records and verify a representative object from each owner/type can be downloaded and decoded.
8. Verify migrated users must reset legacy passwords and that role-to-permission claims match the approved matrix.

Do not proceed while counts/checksums are unexplained or any migration is not idempotent on a second run.

## 6. Production cutover

1. Announce the maintenance window and enable the rollback decision channel.
2. Freeze writes to the legacy application and verify no legacy writer remains active.
3. Take final SQL and media backups, then record the final legacy counts.
4. Deploy SQL/MinIO configuration and start dependencies without exposing the new frontend to general traffic.
5. Apply the database migrations once from a controlled release task.
6. Run media migration dry-run and compare it with the staging rehearsal.
7. Run the real migration, then run it again to prove idempotency.
8. Reconcile final source/destination counts and checksums. Preserve the report as a release artifact.
9. Deploy the API and frontend images by digest.
10. Execute smoke tests for login, forced password reset, protected-route redirect, CSRF rejection, upload, download, SignalR, permission denial, and logout.
11. Open access to the canary group only. Monitor authentication failures, 401/403/400/500 rates, database health, MinIO health, migration exceptions, and latency.
12. Expand traffic only after the canary acceptance window passes and the rollback owner approves.

## 7. Rollback criteria and procedure

Rollback immediately when any of these occurs and cannot be safely corrected within the agreed window:

- Identity migration loss, duplicate membership, or widespread login/reset failure.
- Unexplained media count/checksum mismatch, object corruption, or private-bucket exposure.
- Persistent CSRF/session failures, authorization bypass, or elevated server errors.
- SQL or MinIO instability that threatens data integrity.

Rollback steps:

1. Stop new writes and remove the new release from traffic.
2. Preserve logs and migration reconciliation reports without recording secrets.
3. Restore the last known-good application images and configuration.
4. Restore SQL and media from the verified cutover backups when the new release wrote incompatible data.
5. Re-enable the legacy application in read/write mode only after data consistency checks pass.
6. Rotate any credential suspected of exposure during the incident.

## 8. Post-cutover and legacy removal

- Continue count/checksum reconciliation and error monitoring through the agreed stability period.
- Perform a second restore drill from post-cutover backups.
- Keep `imageAPI` and legacy media read-only during the full rollback period.
- Remove legacy media code/data only after the release owner confirms stable canary/general traffic, verified backups, a successful restore drill, zero unexplained reconciliation differences, and an expired rollback window.
- Record final approval and retain audit/reconciliation evidence according to the organization's retention policy.
