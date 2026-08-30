# Credential rotation checklist

The repository previously contained database and ElevenLabs credentials. Removing
them from the current tree does not revoke copies in Git history or deployed images.

- Revoke both exposed ElevenLabs API keys and issue a server-only replacement.
- Rotate the SQL Server `sa` password; create a least-privileged application login.
- Replace every deployed secret through the deployment secret store.
- Invalidate existing JWTs by removing the former signing key from all deployments.
- Purge or rewrite Git history only after coordinating with every repository clone.
- Run `bun run secrets:check` in `fe` and the CI secret-scanning stage before deploy.
- Record the operator, timestamp, affected environments and verification evidence.

No real credential should be written into this document or any tracked file.
