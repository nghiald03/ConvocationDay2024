const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const ExcelJS = require('exceljs');

const app = express();
const port = 3214;

// Đường dẫn tuyệt đối đến thư mục 'uploads'
const uploadDir = path.join(__dirname, 'uploads');

app.use(fileUpload());
app.use(cors());

// Cung cấp thư mục 'uploads' dưới dạng tệp tĩnh
app.use('/uploads', express.static(uploadDir));

app.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const uploadedFiles = Array.isArray(req.files.file)
    ? req.files.file
    : [req.files.file];

  uploadedFiles.forEach((file) => {
    const fileName = file.name.substring(file.name.lastIndexOf(' ') + 1);
    const uploadPath = path.join(uploadDir, fileName);
    console.log(uploadPath);
    file.mv(uploadPath, (err) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
    });
  });

  res.send('Files uploaded!');
});

app.get('/exportToExcel', (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Files');

  const files = fs.readdirSync(uploadDir);

  files.forEach((file, index) => {
    worksheet.addRow([file]);
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats');
  res.setHeader('Content-Disposition', 'attachment; filename=files.xlsx');
  workbook.xlsx.write(res).then(() => {
    res.end();
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
