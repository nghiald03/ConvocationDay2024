// src/components/multiHallStatusDisplay.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAllHallsData } from '@/features/led/queries/use-all-halls-data';
import React from 'react';
import {
  Building2,
  BookOpen,
  Award,
  Loader2,
  WifiOff,
  User,
  Clock,
  GraduationCap,
} from 'lucide-react';

// --- Component phụ: Hiển thị chi tiết cử nhân của từng Hall ---
interface BachelorDetailCardProps {
  hallName: string;
  bachelorCurrent: any | null;
  sessionNum: string | number;
  isFetching: boolean;
}

const BachelorDetailCard: React.FC<BachelorDetailCardProps> = ({
  hallName,
  bachelorCurrent,
  sessionNum,
  isFetching,
}) => {
  const isAvailable = !!bachelorCurrent && !!bachelorCurrent.fullName;
  console.log('bachelorCurrent in BachelorDetailCard:', bachelorCurrent);
  return (
    <Card
      className={`border-2 transition-all duration-300 ${
        isAvailable
          ? 'shadow-lg hover:shadow-xl border-orange-200 dark:border-orange-800'
          : 'shadow-md border-slate-200 dark:border-slate-800'
      } relative overflow-hidden`}
    >
      <CardHeader className='flex flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800'>
        <div className='flex items-center gap-2'>
          <Building2 className='w-5 h-5 text-orange-600 dark:text-orange-400' />
          <CardTitle className='text-lg font-bold text-orange-600 dark:text-orange-400'>
            Hall: {hallName} - Session{' '}
            {bachelorCurrent?.sessionInDay
              ? `#${bachelorCurrent.sessionInDay}`
              : 'N/A'}{' '}
            {bachelorCurrent?.chair ? `- STT: ${bachelorCurrent.chair}` : ''}
          </CardTitle>
        </div>
        {isAvailable && (
          <Badge className='bg-green-500 hover:bg-green-600'>
            Đang trình chiếu
          </Badge>
        )}
      </CardHeader>

      {isFetching ? (
        <CardContent className='p-4 text-center text-sm text-muted-foreground'>
          <Loader2 className='w-4 h-4 inline mr-2 animate-spin' /> Đang cập
          nhật...
        </CardContent>
      ) : isAvailable ? (
        <CardContent className='p-4 space-y-3'>
          {/* Session */}
          {/* <div className='flex items-center gap-3'>
            <Clock className='w-5 h-5 text-gray-500' />
            <p className='text-sm text-foreground font-medium'>
              Session: **{bachelorCurrent.sessionNum}**
            </p>
          </div> */}
          {/* Tên và Mã số */}
          <div className='flex items-center gap-3'>
            <User className='w-5 h-5 text-indigo-500' />
            <div className='flex-1'>
              <p className='text-sm font-semibold text-foreground'>
                {bachelorCurrent.fullName}
              </p>
              <p className='text-xs text-muted-foreground'>
                Mã SV: {bachelorCurrent.studentCode}
              </p>
            </div>
          </div>

          {/* Ngành học */}
          <div className='flex items-center gap-3'>
            <BookOpen className='w-5 h-5 text-purple-500' />
            <p className='text-sm text-foreground'>{bachelorCurrent.major}</p>
          </div>

          {/* Chức danh (Chair) */}
          {(bachelorCurrent.chair || bachelorCurrent.chairParent) && (
            <div className='flex items-start gap-3'>
              <Award className='w-5 h-5 text-amber-500 shrink-0 mt-1' />
              <div className='flex-1'>
                <p className='text-sm font-semibold text-amber-600 dark:text-amber-400'>
                  {bachelorCurrent.chair}
                </p>
                {bachelorCurrent.chairParent && (
                  <p className='text-xs text-muted-foreground'>
                    {bachelorCurrent.chairParent}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      ) : (
        <CardContent className='p-4 text-center text-sm text-muted-foreground'>
          Chưa có cử nhân nào được trình chiếu.
        </CardContent>
      )}
    </Card>
  );
};

// --- Component Chính Tái Sử Dụng ---
export function MultiHallStatusDisplay() {
  const { allHallsData, hallListLoading, isFetchingAny } = useAllHallsData();
  console.log('allHallsData in MultiHallStatusDisplay:', allHallsData);

  if (hallListLoading) {
    return (
      <Card className='border-2 shadow-lg'>
        <CardContent className='p-12 text-center'>
          <Loader2 className='w-8 h-8 inline mr-2 animate-spin text-orange-500' />{' '}
          Đang tải danh sách Hội trường...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='border-2 shadow-lg'>
      <CardHeader className='bg-orange-50 dark:bg-orange-900/50 border-b dark:border-orange-900'>
        <CardTitle className='text-xl flex items-center justify-between text-orange-700 dark:text-orange-300'>
          <div className='flex items-center gap-2'>
            <GraduationCap className='w-5 h-5' />
            Trạng thái trao bằng hiện tại
          </div>
          {isFetchingAny && (
            <div className='flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 animate-pulse'>
              <Loader2 className='w-4 h-4 animate-spin' /> Đang cập nhật...
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className='p-4 md:p-6'>
        {allHallsData.length === 0 ? (
          <div className='text-center py-10 text-muted-foreground'>
            <WifiOff className='w-12 h-12 mx-auto mb-4 text-slate-400' />
            <p className='text-lg font-semibold'>
              Không tìm thấy Hội trường nào trong danh sách.
            </p>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6'>
            {allHallsData.map((data) => (
              <BachelorDetailCard
                key={data.hallInfo.hallId}
                sessionNum={data.bachelor ? data.bachelor.sessionNum : 'N/A'}
                hallName={data.hallInfo.hallName}
                bachelorCurrent={data.bachelor}
                isFetching={data.isFetching}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
