import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface StudentData {
  studentCode: string;
  fullName: string;
  mail: string;
  major: string;
  hallName: string;
  sessionNum: number;
  chair: string;
  chairParent: string;
  checkIn: boolean;
  timeCheckIn: string;
}

// Hàm để export dữ liệu
export const exportToExcel = async (
  dataInput: Partial<StudentData>[] | StudentData[] | null | undefined,
  fileName: string = 'students_data.xlsx'
) => {
  try {
    // Đảm bảo dữ liệu là mảng để tránh lỗi undefined
    const data = Array.isArray(dataInput) ? dataInput : [];

    // 1. Chuyển đổi dữ liệu thành định dạng phù hợp, có kiểm tra an toàn
    const formattedData = data.map((s: Partial<StudentData> = {}) => {
      const studentCode = s.studentCode ?? '';
      const fullName = s.fullName ?? '';
      const mail = s.mail ?? '';
      const major = s.major ?? '';
      const hallName = s.hallName ?? '';
      const sessionNum = s.sessionNum ?? '';
      const chair = s.chair ?? '';
      const chairParent = s.chairParent ?? '';
      const checkIn = s.checkIn === true ? 'Yes' : 'No';

      let checkInTime = '';
      if (s.timeCheckIn) {
        const adjustedTime = new Date(s.timeCheckIn);
        if (!isNaN(adjustedTime.getTime())) {
          adjustedTime.setHours(adjustedTime.getHours() + 7); // Thêm 7 giờ
          checkInTime = adjustedTime.toLocaleString();
        }
      }

      return {
        'Student Code': studentCode,
        'Full Name': fullName,
        Email: mail,
        Major: major,
        'Hall Name': hallName,
        'Session Number': sessionNum,
        Chair: chair,
        'Chair Parent': chairParent,
        'Checked In': checkIn,
        'Check-In Time': checkInTime,
      };
    });

    // 2. Tạo một workbook và sheet từ dữ liệu
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    // 3. Tạo buffer (dành cho Node.js) hoặc blob (trình duyệt)
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // 4. Tải file xuống
    saveAs(blob, fileName);
  } catch (err) {
    // Tránh crash UI, log lỗi để debug
    console.error('Export to Excel failed:', err);
  }
};
