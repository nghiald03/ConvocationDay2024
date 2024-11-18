'use client';
import TableCustom from '@/components/table/table';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Icon } from '@iconify/react/dist/iconify.js';
import { ColumnDef } from '@tanstack/react-table';
import { Eye, SquarePen, Trash2 } from 'lucide-react';
import React from 'react';

type DataProps = {
  id: string | number;
  vaccineName: string; // Tên vaccine
  diseasePrevented: string[]; // Loại bệnh phòng ngừa
  animalType: string[]; // Loại vật nuôi (ví dụ: bò, gà, lợn)
  dosage: string; // Liều lượng (ví dụ: 2 ml cho mỗi con)
  administrationMethod: string; // Cách tiêm (ví dụ: tiêm bắp, tiêm dưới da)
  boosterSchedule: string; // Lịch tiêm nhắc lại (ví dụ: mỗi 6 tháng)
  expirationDate?: Date; // Ngày hết hạn của vaccine
  notes?: string; // Ghi chú bổ sung (tuỳ chọn)
};

export default function page() {
  const columns: ColumnDef<DataProps>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      accessorKey: 'vaccineName',
      header: 'Tên',
    },
    {
      accessorKey: 'diseasePrevented',
      header: 'Loại bệnh phòng ngừa',
    },
    {
      accessorKey: 'animalType',
      header: 'Loại vật nuôi',
    },
    {
      accessorKey: 'dosage',
      header: 'Liều lượng',
    },
    {
      accessorKey: 'administrationMethod',
      header: 'Cách tiêm',
    },
    {
      accessorKey: 'boosterSchedule',
      header: 'Lịch nhắc lại',
    },
  ];

  const data: DataProps[] = [
    {
      id: 1,
      vaccineName: 'Bovine Respiratory Vaccine',
      diseasePrevented: ['Bệnh hô hấp', 'Viêm phổi'],
      animalType: ['Bò'],
      dosage: '2 ml/con',
      administrationMethod: 'Tiêm bắp',
      boosterSchedule: 'Mỗi 6 tháng',
      expirationDate: new Date('2025-06-30'),
      notes: 'Không sử dụng cho bê con dưới 2 tháng tuổi',
    },
    {
      id: 2,
      vaccineName: 'Swine Flu Vaccine',
      diseasePrevented: ['Cúm lợn'],
      animalType: ['Lợn'],
      dosage: '1.5 ml/con',
      administrationMethod: 'Tiêm dưới da',
      boosterSchedule: 'Mỗi 4 tháng',
      expirationDate: new Date('2024-12-15'),
    },
    {
      id: 3,
      vaccineName: 'Poultry Cholera Vaccine',
      diseasePrevented: ['Dịch tả gia cầm'],
      animalType: ['Gà', 'Vịt'],
      dosage: '0.5 ml/con',
      administrationMethod: 'Tiêm dưới da',
      boosterSchedule: 'Mỗi 12 tháng',
      expirationDate: new Date('2026-03-01'),
      notes: 'Lắc đều trước khi sử dụng',
    },
    {
      id: 4,
      vaccineName: 'FMD Vaccine',
      diseasePrevented: ['Lở mồm long móng'],
      animalType: ['Bò', 'Trâu'],
      dosage: '2 ml/con',
      administrationMethod: 'Tiêm bắp',
      boosterSchedule: 'Mỗi 6 tháng',
      expirationDate: new Date('2025-11-20'),
    },
    {
      id: 5,
      vaccineName: 'Newcastle Disease Vaccine',
      diseasePrevented: ['Bệnh Newcastle'],
      animalType: ['Gà', 'Vịt'],
      dosage: '1 ml/con',
      administrationMethod: 'Tiêm dưới da',
      boosterSchedule: 'Mỗi 6 tháng',
      expirationDate: new Date('2025-05-30'),
      notes: 'Giữ vaccine trong điều kiện lạnh',
    },
    {
      id: 6,
      vaccineName: 'Rabies Vaccine',
      diseasePrevented: ['Dại'],
      animalType: ['Chó', 'Mèo'],
      dosage: '1 ml/con',
      administrationMethod: 'Tiêm dưới da',
      boosterSchedule: 'Mỗi 12 tháng',
      expirationDate: new Date('2026-08-12'),
    },
    {
      id: 7,
      vaccineName: 'Swine Parvovirus Vaccine',
      diseasePrevented: ['Parvovirus'],
      animalType: ['Lợn'],
      dosage: '2 ml/con',
      administrationMethod: 'Tiêm bắp',
      boosterSchedule: 'Mỗi 12 tháng',
      expirationDate: new Date('2025-09-25'),
      notes: 'Không tiêm cho heo nái mang thai',
    },
    {
      id: 8,
      vaccineName: 'Avian Influenza Vaccine',
      diseasePrevented: ['Cúm gia cầm'],
      animalType: ['Gà', 'Vịt'],
      dosage: '0.3 ml/con',
      administrationMethod: 'Tiêm dưới da',
      boosterSchedule: 'Mỗi 6 tháng',
      expirationDate: new Date('2025-04-15'),
    },
    {
      id: 9,
      vaccineName: 'Clostridial Vaccine',
      diseasePrevented: ['Bệnh do vi khuẩn Clostridium'],
      animalType: ['Bò', 'Cừu'],
      dosage: '2 ml/con',
      administrationMethod: 'Tiêm bắp',
      boosterSchedule: 'Mỗi 6 tháng',
      expirationDate: new Date('2026-02-10'),
    },
    {
      id: 10,
      vaccineName: 'Porcine Circovirus Vaccine',
      diseasePrevented: ['Virus Circovirus'],
      animalType: ['Lợn'],
      dosage: '1 ml/con',
      administrationMethod: 'Tiêm dưới da',
      boosterSchedule: 'Mỗi 12 tháng',
      expirationDate: new Date('2024-12-01'),
      notes: 'Theo dõi sức khỏe sau 24 giờ tiêm',
    },
  ];
  return (
    <Card>
      <CardHeader>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Quản lí</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Quản lí vác-xin</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </CardHeader>
      <CardContent>
        <TableCustom
          title='Quản lí danh sách vác-xin'
          data={data}
          columns={columns}
        ></TableCustom>
      </CardContent>
    </Card>
  );
}
