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
  data: StudentData[],
  fileName: string = 'students_data.xlsx'
) => {
  // 1. Chuyển đổi dữ liệu thành định dạng phù hợp
  const formattedData = data.map((student) => {
    const adjustedTime = new Date(student.timeCheckIn);
    adjustedTime.setHours(adjustedTime.getHours() + 7); // Thêm 7 giờ

    return {
      'Student Code': student.studentCode,
      'Full Name': student.fullName,
      Email: student.mail,
      Major: student.major,
      'Hall Name': student.hallName,
      'Session Number': student.sessionNum,
      Chair: student.chair,
      'Chair Parent': student.chairParent,
      'Checked In': student.checkIn ? 'Yes' : 'No',
      'Check-In Time': adjustedTime.toLocaleString(), // Thời gian sau khi thêm 7 giờ
    };
  });

  // 2. Tạo một workbook và sheet từ dữ liệu
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

  // 3. Tạo buffer (dành cho Node.js) hoặc blob (trình duyệt)
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

  // 4. Tải file xuống
  saveAs(blob, fileName);
};
