import { describe, expect, test } from 'bun:test';
import { buildCheckInReminder, escapeHtml } from '../src/features/check-in/model/check-in-reminder';

describe('buildCheckInReminder', () => {
  const reminder = buildCheckInReminder({
    fullName: 'Nguyen Van A',
    studentCode: 'SE12345',
    room: 'P.005',
    year: 2026,
  });

  test('bản chữ thường đúng mẫu Ban Tổ chức, điền sẵn họ tên, MSSV, phòng và năm', () => {
    expect(reminder.text).toBe(
      [
        '📣 THÔNG BÁO CHECK-IN',
        '━━━━━━━━━━━━━━━━━━━━',
        '',
        'Bạn Tân Cử nhân: Nguyen Van A,',
        'Mã số sinh viên: SE12345',
        '',
        'Ban Tổ chức chưa ghi nhận thông tin điểm danh của bạn. Vui lòng NHANH CHÓNG DI CHUYỂN ĐẾN PHÒNG P.005 để hoàn tất check-in.',
        '',
        'Trân Trọng,',
        'Ban Tổ chức Lễ Tốt nghiệp 2026',
      ].join('\n'),
    );
  });

  test('bản định dạng: tên và MSSV màu cam, lời nhắc màu đỏ, phòng đậm và to hơn', () => {
    expect(reminder.html).toContain('<b>Bạn Tân Cử nhân:</b>');
    expect(reminder.html).toMatch(/color:#F57C00[^>]*><b>Nguyen Van A<\/b>/);
    expect(reminder.html).toMatch(/color:#F57C00[^>]*><b>SE12345<\/b>/);
    expect(reminder.html).toMatch(/color:#D32F2F"><b>NHANH CHÓNG DI CHUYỂN ĐẾN PHÒNG<\/b>/);
    expect(reminder.html).toMatch(/font-size:1\.3em"><b>P\.005<\/b>/);
    expect(reminder.html).toContain('<i>Trân Trọng,</i>');
    expect(reminder.html).toContain('<b>Ban Tổ chức Lễ Tốt nghiệp 2026</b>');
  });

  test('chưa có phòng thì nhắc chung là phòng CHECK-IN, không để trống hay ghi null', () => {
    for (const room of [undefined, null, '', '   ']) {
      const result = buildCheckInReminder({ fullName: 'A', studentCode: 'SE1', room, year: 2026 });
      expect(result.text).toContain('ĐẾN PHÒNG CHECK-IN để hoàn tất');
      expect(result.text).not.toContain('null');
    }
  });

  test('cắt khoảng trắng thừa ở họ tên, MSSV và phòng', () => {
    const result = buildCheckInReminder({ fullName: '  Lê Văn B ', studentCode: ' SE9 ', room: ' P.101 ', year: 2026 });

    expect(result.text).toContain('Bạn Tân Cử nhân: Lê Văn B,');
    expect(result.text).toContain('Mã số sinh viên: SE9\n');
    expect(result.text).toContain('PHÒNG P.101 để');
  });

  test('bản HTML thoát ký tự đặc biệt để họ tên lạ không phá định dạng', () => {
    const result = buildCheckInReminder({ fullName: 'A <b>&</b> "B"', studentCode: 'SE1', room: 'P<1>', year: 2026 });

    expect(result.html).toContain('A &lt;b&gt;&amp;&lt;/b&gt; &quot;B&quot;');
    expect(result.html).toContain('P&lt;1&gt;');
    expect(result.html).not.toContain('<b>&</b>');
    // Bản chữ thường giữ nguyên, không thoát.
    expect(result.text).toContain('A <b>&</b> "B"');
  });

  test('mặc định lấy năm hiện tại', () => {
    const result = buildCheckInReminder({ fullName: 'A', studentCode: 'SE1', room: 'P.1' });

    expect(result.text).toContain(`Lễ Tốt nghiệp ${new Date().getFullYear()}`);
  });
});

describe('escapeHtml', () => {
  test('thoát đủ năm ký tự đặc biệt', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});
