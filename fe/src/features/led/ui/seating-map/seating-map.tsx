'use client';

import { useMemo } from 'react';
import { buildSeatBoard, type SeatOccupant, type SeatSide } from '../../model/seat-board';
import type { SeatingMode } from './seat-cell';
import type { SeatEntry } from './seat-cell';
import { SeatGrid } from './seat-grid';
import { SeatingHeader } from './seating-header';

const SIDE_TITLE: Record<SeatSide, string> = { Left: 'Bên trái', Right: 'Bên phải' };

export type SeatingMapProps = {
  occupants: SeatOccupant[];
  side: SeatSide;
  /** `led`: chỉ mã ghế và tên, để nhìn từ xa. `management`: thêm MSSV. */
  mode?: SeatingMode;
  /** Giãn các hàng ghế cho vừa chiều cao có sẵn (dùng khi trình chiếu toàn màn hình). */
  fill?: boolean;
  /** Đặt người bị xếp xuống cuối vào ô ghế cũ của họ. */
  useOriginalSeat?: boolean;
  /** Ẩn dòng tên bên (Bên trái / Bên phải) khi nơi khác đã cho biết bên đang xem. */
  hideHeader?: boolean;
  /** Khoanh ô người LED đang gọi (xanh đậm) và sắp gọi (tím). Mặc định tắt. */
  showCalling?: boolean;
  /** MSSV đang chọn và hàm khi bấm/chạm một ô có người (xem tên đầy đủ). */
  selectedCode?: string | null;
  onSelectSeat?: (occupant: SeatEntry) => void;
};

/**
 * Sơ đồ ghế một bên của hội trường, nhìn từ sân khấu xuống: Left 25–50 hoặc Right 24–01, hàng A–J.
 * Kích thước chữ và khoảng cách đều theo bề rộng của chính sơ đồ (`cqw`), không theo viewport.
 */
export function SeatingMap({
  occupants,
  side,
  mode = 'management',
  fill = false,
  useOriginalSeat = false,
  hideHeader = false,
  showCalling = false,
  selectedCode,
  onSelectSeat,
}: SeatingMapProps) {
  const board = useMemo(() => buildSeatBoard(occupants, { useOriginalSeat, showCalling }),
    [occupants, useOriginalSeat, showCalling],
  );

  return (
    <div
      className={`w-full text-[#1E293B] [container-type:inline-size] ${fill ? 'flex h-full min-h-0 flex-col' : ''}`}
    >
      {!hideHeader && <SeatingHeader title={SIDE_TITLE[side]} align={side === 'Right' ? 'right' : 'left'} />}
      <SeatGrid
        side={side}
        seats={board.seats}
        mode={mode}
        fill={fill}
        selectedCode={selectedCode}
        onSelect={onSelectSeat}
      />
    </div>
  );
}
