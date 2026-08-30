// src/app/BachelorInfoScreen.tsx (Cập nhật)

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// import { useAllHallsData } from '@/hooks/useAllHallsData'; // KHÔNG CẦN TRỰC TIẾP
import React from 'react';
import { Users, Loader2 } from 'lucide-react';

// === NEW: Import component tái sử dụng ===
import { MultiHallStatusDisplay } from '@/features/led/ui/multi-hall-status-display';
import { useAllHallsData } from '@/features/led/queries/use-all-halls-data';

// --- (Đã loại bỏ BachelorDetailCard vì nó đã được chuyển vào MultiHallStatusDisplay) ---

export default function BachelorInfoScreen() {
  // Chỉ cần lấy trạng thái kết nối từ hook (vì MultiHallStatusDisplay đã gọi hook chính)
  const { isConnected, hallListLoading } = useAllHallsData();

  if (hallListLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='flex flex-col items-center gap-4 p-8 bg-white dark:bg-slate-900 rounded-lg shadow-xl'>
          <Loader2 className='w-10 h-10 text-orange-500 animate-spin' />
          <p className='text-lg font-medium text-muted-foreground'>
            Đang tải danh sách Hội trường...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-indigo-50 dark:from-slate-950 dark:via-orange-950 dark:to-indigo-950'>
      <div className='mx-auto p-6 md:p-8 '>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='p-3 bg-gradient-to-br from-orange-500 to-indigo-600 rounded-xl shadow-lg'>
              <Users className='w-8 h-8 text-white' />
            </div>
            <div>
              <h1 className='text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 to-indigo-600 bg-clip-text text-transparent'>
                Theo dõi Đa Hội trường
              </h1>
              <p className='text-sm text-muted-foreground mt-1'>
                Thông tin sinh viên tốt nghiệp hiện tại của tất cả các Hall
                (Realtime và độc lập)
              </p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className='mb-6'>
          <Card className='border-2 shadow-sm flex items-center p-4 justify-start'>
            <Badge
              className={`px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
                isConnected
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              <div className='flex items-center gap-2'>
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-white animate-pulse' : 'bg-white'
                  }`}
                />
                {isConnected ? 'SignalR: Đã kết nối' : 'SignalR: Mất kết nối'}
              </div>
            </Badge>
          </Card>
        </div>

        {/* Main Content - Component Tái Sử Dụng */}
        <MultiHallStatusDisplay />
      </div>
    </div>
  );
}
