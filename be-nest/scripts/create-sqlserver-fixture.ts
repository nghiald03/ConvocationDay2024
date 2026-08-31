import { pbkdf2Sync } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sql from 'mssql';

const databaseName = 'ConvocationMigrationFixture';
const adminUrl = process.env.SQLSERVER_ADMIN_URL;
if (!adminUrl) throw new Error('Thiếu SQLSERVER_ADMIN_URL để tạo fixture.');

function legacyPasswordHash(password: string): string {
  const salt = Buffer.from('0123456789abcdef');
  const subkey = pbkdf2Sync(password, salt, 10_000, 32, 'sha256');
  const payload = Buffer.alloc(13 + salt.length + subkey.length);
  payload[0] = 1;
  payload.writeUInt32BE(1, 1);
  payload.writeUInt32BE(10_000, 5);
  payload.writeUInt32BE(salt.length, 9);
  salt.copy(payload, 13);
  subkey.copy(payload, 13 + salt.length);
  return payload.toString('base64');
}

const master = await sql.connect(adminUrl);
try {
  await master.request().query(`
    if db_id('${databaseName}') is not null
    begin
      alter database [${databaseName}] set single_user with rollback immediate;
      drop database [${databaseName}];
    end;
    create database [${databaseName}];
  `);
} finally {
  await master.close();
}

const fixtureUrl = new URL(adminUrl);
fixtureUrl.pathname = `/${databaseName}`;
const fixture = await new sql.ConnectionPool(fixtureUrl.toString()).connect();
try {
  const source = await readFile(resolve('test/fixtures/sqlserver-schema.sql'), 'utf8');
  await fixture.request().input('passwordHash', sql.NVarChar, legacyPasswordHash('Legacy-Password-123')).batch(source);
  console.log(`Đã tạo SQL Server fixture ${databaseName}.`);
} finally {
  await fixture.close();
}
