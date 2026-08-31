import { randomBytes } from 'node:crypto';

const secret = randomBytes(48).toString('base64url');

process.stdout.write(`BETTER_AUTH_SECRET=${secret}\n`);
