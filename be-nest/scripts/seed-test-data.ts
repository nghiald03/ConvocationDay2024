import { Pool, type PoolClient } from 'pg';
import { hashPassword } from 'better-auth/crypto';

const BACHELOR_COUNT = 240;
const TEST_CODE_PREFIX = 'TEST26';
const allowedDatabaseName = /(dev|test|local|demo|migration)/i;

const familyNames = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
  'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý',
];
const middleNames = ['Văn', 'Thị', 'Minh', 'Hoàng', 'Ngọc', 'Thanh', 'Đức', 'Gia'];
const givenNames = [
  'An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hạnh', 'Hiếu', 'Hùng',
  'Huy', 'Lan', 'Linh', 'Long', 'Mai', 'Nam', 'Nga', 'Ngân', 'Phong', 'Phương',
  'Quân', 'Quang', 'Thảo', 'Trang', 'Trí', 'Tuấn', 'Vy', 'Yến',
];
const majors = [
  ['Công nghệ thông tin', 'Khoa Công nghệ thông tin'],
  ['Quản trị kinh doanh', 'Khoa Kinh tế'],
  ['Ngôn ngữ Anh', 'Khoa Ngoại ngữ'],
  ['Thiết kế đồ họa', 'Khoa Mỹ thuật ứng dụng'],
  ['Kỹ thuật phần mềm', 'Khoa Công nghệ thông tin'],
  ['Marketing', 'Khoa Kinh tế'],
] as const;
const hallNames = ['Hội trường A', 'Hội trường B', 'Hội trường C', 'Hội trường D'];
const testAccounts = [
  { id: 'test-user-mn', email: 'manager.test@convocation.local', name: 'Quản lý thử nghiệm', role: 'MN' },
  { id: 'test-user-ck', email: 'checkin.test@convocation.local', name: 'Nhân viên check-in thử nghiệm', role: 'CK' },
  { id: 'test-user-mc', email: 'mc.test@convocation.local', name: 'MC thử nghiệm', role: 'MC' },
  { id: 'test-user-us', email: 'user.test@convocation.local', name: 'Người dùng thử nghiệm', role: 'US' },
  { id: 'test-user-no', email: 'notify.test@convocation.local', name: 'Người đọc thông báo thử nghiệm', role: 'NO' },
] as const;

interface BachelorSeed {
  studentCode: string;
  fullName: string;
  mail: string;
  faculty: string;
  major: string;
  image: string;
  hallIndex: number;
  sessionIndex: number;
  chair: string;
  chairParent: string;
  checkIn: boolean;
  status: boolean;
  bachelorStatus: string | null;
  attendanceStatus: number;
  timeCheckIn: Date | null;
}

function createBachelors(): BachelorSeed[] {
  return Array.from({ length: BACHELOR_COUNT }, (_, index) => {
    const number = index + 1;
    const [major, faculty] = majors[index % majors.length]!;
    const sessionIndex = index % 6;
    const hallIndex = Math.floor(index / 6) % hallNames.length;
    const checkedIn = index % 3 !== 0;
    const row = Math.floor(index / 12) + 1;
    const seat = (index % 12) + 1;
    return {
      studentCode: `${TEST_CODE_PREFIX}${number.toString().padStart(4, '0')}`,
      fullName: `${familyNames[index % familyNames.length]} ${middleNames[index % middleNames.length]} ${givenNames[index % givenNames.length]}`,
      mail: `test26${number.toString().padStart(4, '0')}@example.edu.vn`,
      faculty,
      major,
      image: `/images/users/user-${(index % 6) + 1}.jpg`,
      hallIndex,
      sessionIndex,
      chair: `${String.fromCharCode(65 + hallIndex)}${row}-${seat}`,
      chairParent: `${String.fromCharCode(65 + hallIndex)}${row}-P${seat}`,
      checkIn: checkedIn,
      status: checkedIn && index % 5 === 0,
      bachelorStatus: checkedIn && index % 5 === 0 ? 'Ready' : null,
      attendanceStatus: checkedIn ? 1 : 0,
      timeCheckIn: checkedIn ? new Date(Date.UTC(2026, 7, 31, 1 + sessionIndex, index % 60)) : null,
    };
  });
}

async function ensureHalls(client: PoolClient): Promise<number[]> {
  const ids: number[] = [];
  for (const name of hallNames) {
    await client.query('insert into hall (hall_name) values ($1) on conflict do nothing', [name]);
    const result = await client.query<{ hall_id: number }>(
      'select hall_id from hall where lower(hall_name) = lower($1)',
      [name],
    );
    ids.push(result.rows[0]!.hall_id);
  }
  return ids;
}

async function ensureSessions(client: PoolClient): Promise<number[]> {
  const ids: number[] = [];
  for (let index = 0; index < 6; index += 1) {
    const sessionNumber = index + 1;
    const sessionInDay = (index % 3) + 1;
    await client.query(
      `insert into session (session_number, session_in_day, description)
       values ($1, $2, $3)
       on conflict (session_number) where session_number is not null do update
       set session_in_day = excluded.session_in_day, description = excluded.description`,
      [sessionNumber, sessionInDay, `Phiên thử nghiệm ${sessionNumber}`],
    );
    const result = await client.query<{ session_id: number }>(
      'select session_id from session where session_number = $1',
      [sessionNumber],
    );
    ids.push(result.rows[0]!.session_id);
  }
  return ids;
}

async function seedAccounts(client: PoolClient, password: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  for (const account of testAccounts) {
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
      [account.id, account.name, account.email],
    );
    await client.query(
      `insert into auth_account (
         id, account_id, provider_id, issuer, user_id, password, updated_at
       ) values ($1, $2, 'credential', 'local:credential', $2, $3, now())
       on conflict (id) do update set password = excluded.password, updated_at = now()`,
      [`test-account-${account.role.toLowerCase()}`, account.id, passwordHash],
    );
    await client.query('delete from auth_session where user_id = $1', [account.id]);
    await client.query('delete from user_role where user_id = $1', [account.id]);
    await client.query('insert into user_role (user_id, role_code) values ($1, $2)', [
      account.id,
      account.role,
    ]);
  }
}

async function seed(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const confirmed = process.argv.includes('--confirm-test-data');
  const bachelors = createBachelors();

  if (dryRun) {
    console.log(JSON.stringify({
      bachelors: bachelors.length,
      halls: hallNames.length,
      sessions: 6,
      images: 6,
      accounts: testAccounts.length,
    }));
    return;
  }
  if (!confirmed) {
    throw new Error('Thiếu cờ --confirm-test-data; seed đã bị hủy để bảo vệ dữ liệu.');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Cần cấu hình DATABASE_URL để chạy seed.');
  const testAccountPassword = process.env.TEST_ACCOUNT_PASSWORD;
  if (!testAccountPassword || testAccountPassword.length < 12) {
    throw new Error('Cần cấu hình TEST_ACCOUNT_PASSWORD tối thiểu 12 ký tự để seed account.');
  }
  const target = new URL(databaseUrl);
  const databaseName = target.pathname.replace(/^\//, '');
  if (!allowedDatabaseName.test(databaseName)) {
    throw new Error(`Database ${databaseName} không được phép nhận test seed.`);
  }

  const pool = new Pool({ connectionString: databaseUrl, application_name: 'convocation-test-seed' });
  const client = await pool.connect();
  try {
    await client.query('begin');
    const hallIds = await ensureHalls(client);
    const sessionIds = await ensureSessions(client);
    await seedAccounts(client, testAccountPassword);

    for (const hallId of hallIds) {
      for (let index = 0; index < sessionIds.length; index += 1) {
        await client.query(
          `insert into check_in (hall_id, session_id, status)
           values ($1, $2, $3)
           on conflict (hall_id, session_id) do update set status = excluded.status`,
          [hallId, sessionIds[index], index < 4],
        );
      }
    }

    await client.query('delete from bachelor where student_code like $1', [`${TEST_CODE_PREFIX}%`]);
    for (const item of bachelors) {
      await client.query(
        `insert into bachelor (
          student_code, full_name, mail, faculty, major, image, status, bachelor_status,
          hall_id, session_id, chair, chair_parent, session_in_day, check_in,
          time_check_in, attendance_status
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16
        )`,
        [
          item.studentCode, item.fullName, item.mail, item.faculty, item.major, item.image,
          item.status, item.bachelorStatus, hallIds[item.hallIndex], sessionIds[item.sessionIndex],
          item.chair, item.chairParent, (item.sessionIndex % 3) + 1, item.checkIn,
          item.timeCheckIn, item.attendanceStatus,
        ],
      );
    }
    await client.query('commit');

    const result = await pool.query<{ count: string }>(
      'select count(*)::text as count from bachelor where student_code like $1',
      [`${TEST_CODE_PREFIX}%`],
    );
    console.log(
      `Đã seed ${result.rows[0]!.count} tân cử nhân và ${testAccounts.length} account thử nghiệm.`,
    );
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

await seed();
