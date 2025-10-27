import React from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';

const IntroPage = () => {
  return (
    <Card className=''>
      <CardContent className='p-3'>
        {' '}
        <div className='text-center mb-8'>
          <Typography variant='h1' className='text-3xl font-bold'>
            Hệ thống Check-in cho Lễ Tốt Nghiệp
          </Typography>
          <p className='text-gray-600 mt-2'>
            Một giải pháp tự động hóa toàn diện để quản lý và tổ chức lễ tốt
            nghiệp.
          </p>
        </div>
        {/* Accordion Sections */}
        <Accordion type='single' collapsible className='space-y-4'>
          {/* Tổng quan kiến trúc */}
          <AccordionItem value='architecture'>
            <AccordionTrigger className='text-lg font-semibold'>
              1. Tổng quan kiến trúc
            </AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardHeader>
                  <CardTitle>Kiến trúc hệ thống</CardTitle>
                </CardHeader>
                <CardContent className='space-y-2'>
                  <section>
                    <ul className='list-disc list-inside space-y-2'>
                      <li>
                        <strong>Frontend (FE):</strong> Viết bằng{' '}
                        <code>Next.js</code> với TypeScript, cung cấp giao diện
                        người dùng thân thiện và hiệu năng cao. Tích hợp API với
                        backend để xử lý dữ liệu và các yêu cầu từ người dùng.
                      </li>
                      <li>
                        <strong>Backend (BE):</strong> Viết bằng{' '}
                        <code>C# .NET</code>, đảm bảo hiệu suất và khả năng mở
                        rộng. Xử lý logic nghiệp vụ và giao tiếp với cơ sở dữ
                        liệu.
                      </li>
                      <li>
                        <strong>Database:</strong> Sử dụng{' '}
                        <code>Microsoft SQL Server</code> để lưu trữ thông tin
                        tân cử nhân, hội trường, buổi lễ, và trạng thái
                        check-in.
                      </li>
                      <li>
                        <strong>Docker:</strong> Toàn bộ hệ thống được đóng gói
                        trong các container Docker để dễ dàng triển khai và chạy
                        trên môi trường local.
                      </li>
                    </ul>
                  </section>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          {/* Vai trò người dùng */}
          <AccordionItem value='roles'>
            <AccordionTrigger className='text-lg font-semibold'>
              2. Vai trò người dùng
            </AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardHeader>
                  <CardTitle>Vai trò người dùng trong hệ thống</CardTitle>
                </CardHeader>
                <CardContent>
                  <section>
                    <p>
                      Hệ thống có 3 vai trò chính, mỗi vai trò được cung cấp
                      quyền hạn và giao diện riêng:
                    </p>
                    <ul className='list-disc list-inside space-y-4 mt-2'>
                      <li>
                        <strong>Manager (Người Quản Lý):</strong>
                        <ul className='list-disc pl-6 space-y-2'>
                          <li>
                            Quản lý danh sách tân cử nhân: thêm, sửa, xóa thông
                            tin (Họ tên, MSSV, Email, Hall, Session).
                          </li>
                          <li>
                            Upload ảnh đại diện (tên file: <code>MSSV.png</code>
                            ) và quản lý hội trường, buổi lễ.
                          </li>
                          <li>Mở/đóng check-in theo thời gian quy định.</li>
                        </ul>
                      </li>
                      <li>
                        <strong>Checkiner (Nhân viên Check-in):</strong>
                        <ul className='list-disc pl-6 space-y-2'>
                          <li>
                            Thực hiện check-in dựa trên mã số sinh viên (MSSV).
                          </li>
                          <li>
                            Tra cứu vị trí ghế ngồi của tân cử nhân qua giao
                            diện trực quan.
                          </li>
                        </ul>
                      </li>
                      <li>
                        <strong>MC (Người Điều Khiển Lễ):</strong>
                        <ul className='list-disc pl-6 space-y-2'>
                          <li>Hiển thị danh sách tân cử nhân đã check-in.</li>
                          <li>
                            Điều khiển trình chiếu ảnh đại diện trên màn hình
                            LED.
                          </li>
                        </ul>
                      </li>
                    </ul>
                  </section>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          {/* Core Flow */}
          <AccordionItem value='core-flow'>
            <AccordionTrigger className='text-lg font-semibold'>
              3. Core Flow (Luồng chính)
            </AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardHeader>
                  <CardTitle>Luồng xử lý chính</CardTitle>
                </CardHeader>
                <CardContent>
                  <section>
                    <ol className='list-decimal list-inside space-y-2'>
                      <li>
                        <strong>
                          Quản lý danh sách tân cử nhân (Manager):
                        </strong>{' '}
                        Nhập thông tin, upload ảnh đại diện, mở check-in.
                      </li>
                      <li>
                        <strong>Thực hiện check-in (Checkiner):</strong>{' '}
                        Check-in thông qua MSSV và hiển thị vị trí ghế.
                      </li>
                      <li>
                        <strong>Hiển thị trên LED (MC):</strong> Cập nhật danh
                        sách và trình chiếu thông tin tân cử nhân đã check-in.
                      </li>
                    </ol>
                  </section>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          {/* Công nghệ */}
          <AccordionItem value='tech-stack'>
            <AccordionTrigger className='text-lg font-semibold'>
              4. Công nghệ & triển khai
            </AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardHeader>
                  <CardTitle>Công nghệ</CardTitle>
                </CardHeader>
                <CardContent>
                  <section>
                    <ul className='list-disc list-inside space-y-2'>
                      <li>
                        <strong>Frontend:</strong> Framework:{' '}
                        <code>Next.js</code>, Styling: <code>Tailwind CSS</code>{' '}
                        và <code>ShadcnUI</code>, API Integration:{' '}
                        <code>axios</code>.
                      </li>
                      <li>
                        <strong>Backend:</strong> Framework:{' '}
                        <code>ASP.NET Core Web API</code>, xử lý file ảnh và kết
                        nối database.
                      </li>
                      <li>
                        <strong>Database:</strong>
                        <code> Microsoft SQL Server</code>.
                      </li>
                      <li>
                        <strong>Docker:</strong> Container hóa toàn bộ hệ thống
                        để triển khai dễ dàng.
                      </li>
                    </ul>
                  </section>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value='tech-stack'>
            <AccordionTrigger className='text-lg font-semibold'>
              5. Điểm nổi bật
            </AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardHeader>
                  <CardTitle>Điểm nổi bật</CardTitle>
                </CardHeader>
                <CardContent>
                  <section>
                    <p>
                      Hệ thống tối ưu hóa và tự động hóa quy trình check-in,
                      giúp tiết kiệm thời gian và nâng cao hiệu quả:
                    </p>
                    <ul className='list-disc list-inside space-y-2 mt-2'>
                      <li>
                        Tự động nhập danh sách từ Excel, kiểm tra tính hợp lệ và
                        xử lý dữ liệu nhanh chóng.
                      </li>
                      <li>
                        Quản lý thời gian check-in tự động, gửi thông báo cho
                        các vai trò liên quan.
                      </li>
                      <li>
                        Tích hợp thông báo thời gian thực với{' '}
                        <code>SignalR</code>.
                      </li>
                      <li>
                        Tự động trình chiếu ảnh đại diện và thông tin tân cử
                        nhân trên màn hình LED.
                      </li>
                    </ul>
                  </section>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
      {/* Header */}
    </Card>
  );
};

export default IntroPage;
