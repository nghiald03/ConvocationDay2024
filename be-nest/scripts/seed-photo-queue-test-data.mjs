import { hashPassword } from 'better-auth/crypto';
import pg from 'pg';

const allowedDatabaseName = /(dev|test|local|demo|migration)/i;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const target = new URL(databaseUrl);
const databaseName = target.pathname.replace(/^\//, '');
if (!allowedDatabaseName.test(databaseName)) {
  throw new Error(`Database ${databaseName} is not allowed for test seed.`);
}

const password = process.env.TEST_ACCOUNT_PASSWORD;
const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

async function seedAccount(id, email, name, roleCode) {
  if (!password || password.length < 12) return;
  const passwordHash = await hashPassword(password);
  await client.query(
    `insert into auth_user (
       id, name, email, email_verified, disabled, password_reset_required,
       failed_login_attempts, lockout_end, updated_at
     ) values ($1, $2, $3, true, false, false, 0, null, now())
     on conflict (id) do update set
       name = excluded.name,
       email = excluded.email,
       email_verified = true,
       disabled = false,
       password_reset_required = false,
       failed_login_attempts = 0,
       lockout_end = null,
       updated_at = now()`,
    [id, name, email],
  );
  await client.query(
    `insert into auth_account (
       id, account_id, provider_id, issuer, user_id, password, updated_at
     ) values ($1, $2, 'credential', 'local:credential', $2, $3, now())
     on conflict (id) do update set password = excluded.password, updated_at = now()`,
    [`test-account-${roleCode.toLowerCase()}`, id, passwordHash],
  );
  await client.query('delete from auth_session where user_id = $1', [id]);
  await client.query('delete from user_role where user_id = $1 and role_code in ($2, $3)', [
    id,
    'PQ',
    'PC',
  ]);
  await client.query(
    'insert into user_role (user_id, role_code) values ($1, $2) on conflict do nothing',
    [id, roleCode],
  );
}

try {
  await client.query('begin');
  await client.query(
    `insert into permission (name, description) values
      ('photo-queue.request', 'Request a photo queue number for a bachelor'),
      ('photo-queue.control', 'Control the active photo queue number')
     on conflict (name) do nothing`,
  );
  await client.query(
    `insert into role (code, name) values
      ('PQ', 'Photo Queue Kiosk'),
      ('PC', 'Photo Queue Coordinator')
     on conflict (code) do nothing`,
  );
  await client.query(
    `insert into role_permission (role_code, permission_name) values
      ('PQ', 'photo-queue.request'),
      ('PC', 'photo-queue.control')
     on conflict do nothing`,
  );

  await seedAccount('test-user-pq', 'photo-kiosk.test@convocation.local', 'Kiosk chụp ảnh thử nghiệm', 'PQ');
  await seedAccount(
    'test-user-pc',
    'photo-coordinator.test@convocation.local',
    'Điều phối chụp ảnh thử nghiệm',
    'PC',
  );

  const sessionResult = await client.query(
    `insert into photo_queue_session (name, description, is_active, is_kiosk_active)
     values
       ('Phiên chụp ảnh test 1', 'Dữ liệu test cho kiosk và điều phối', true, true),
       ('Phiên chụp ảnh test 2', 'Dữ liệu test cho chuyển phiên', true, false)
     on conflict (lower(name)) do update set
       description = excluded.description,
       is_active = true
     returning photo_queue_session_id, name`,
  );
  const sessionIds = new Map(sessionResult.rows.map((row) => [row.name, row.photo_queue_session_id]));
  const activeSessionId = sessionIds.get('Phiên chụp ảnh test 1');
  const secondSessionId = sessionIds.get('Phiên chụp ảnh test 2');

  await client.query('update photo_queue_session set is_kiosk_active = photo_queue_session_id = $1', [
    activeSessionId,
  ]);
  await client.query(
    `insert into photo_queue_state (photo_session_id, current_number, current_photo_confirmed)
     values ($1, 0, true)
     on conflict (photo_session_id) do update set
       current_number = 0,
       current_photo_confirmed = true,
       current_photo_taken = null,
       manual_return_number = null,
       updated_at = now()`,
    [activeSessionId],
  );

  await client.query(
    `delete from photo_queue_entry
     where bachelor_id in (select id from bachelor where student_code like 'TEST26%')`,
  );
  await client.query(
    `delete from photo_queue_assignment
     where bachelor_id in (select id from bachelor where student_code like 'TEST26%')`,
  );

  const bachelors = await client.query(
    `select id, student_code
     from bachelor
     where student_code like 'TEST26%'
     order by student_code
     limit 80`,
  );
  if (!bachelors.rows.length) {
    throw new Error('Không tìm thấy bachelor TEST26%. Hãy chạy seed:test trước rồi chạy lại seed này.');
  }

  let activeAssigned = 0;
  let coordinatorOnly = 0;
  for (const [index, bachelor] of bachelors.rows.entries()) {
    const assignedSessionId = index < 50 ? activeSessionId : secondSessionId;
    const requiresCoordinator = index >= 45 && index < 55;
    await client.query(
      `insert into photo_queue_assignment (
        bachelor_id, photo_session_id, requires_coordinator, note
       ) values ($1, $2, $3, $4)
       on conflict (bachelor_id) do update set
        photo_session_id = excluded.photo_session_id,
        requires_coordinator = excluded.requires_coordinator,
        note = excluded.note`,
      [
        bachelor.id,
        assignedSessionId,
        requiresCoordinator,
        requiresCoordinator ? 'Test dời lịch: phải lấy số tại bàn điều phối' : null,
      ],
    );
    if (assignedSessionId === activeSessionId && !requiresCoordinator) activeAssigned += 1;
    if (requiresCoordinator) coordinatorOnly += 1;
  }

  await client.query('commit');
  console.log(
    JSON.stringify(
      {
        activePhotoSessionId: activeSessionId,
        secondPhotoSessionId: secondSessionId,
        kioskCanRequest: activeAssigned,
        coordinatorOnly,
        sampleKioskStudentCode: 'TEST260001',
        sampleCoordinatorStudentCode: 'TEST260046',
        kioskAccount: password ? 'photo-kiosk.test@convocation.local' : null,
        coordinatorAccount: password ? 'photo-coordinator.test@convocation.local' : null,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}
