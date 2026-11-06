'use client';

import { memo, type KeyboardEvent } from 'react';
import {
  formatSeatNumber,
  givenName,
  type SeatEmphasis,
  type SeatOccupant,
  type SeatState,
} from '../../model/seat-board';

export type SeatEntry = SeatOccupant & { state: SeatState; emphasis?: SeatEmphasis | null };
export type SeatingMode = 'led' | 'management';

/**
 * Ô ghế: viền đậm màu trạng thái trên nền nhạt cùng tông. Chữ tối trên nền nhạt nên tương phản
 * ≥ 4.5:1; ghế trống chỉ còn viền nét đứt mờ, không có nền.
 */
export const SEAT_STYLE: Record<SeatState | 'empty', string> = {
  present: 'border-[#2FBF71] bg-[#D9F6E5] text-[#064E2B]',
  late: 'border-[#F5A524] bg-[#FFEDBF] text-[#6B4200]',
  waiting: 'border-[#FB7C2E] bg-[#FFDCC4] text-[#7C2D12]',
  absent: 'border-[#94A3B8] bg-[#E2E8F0] text-[#334155]',
  empty: 'border-dashed border-[#FED7AA] bg-transparent text-[#E6CDB5]',
};

/**
 * Ô được nhấn mạnh thay hẳn kiểu của trạng thái điểm danh:
 * - đang gọi: tô xanh đậm, chữ trắng, nổi nhẹ lên so với ô bên cạnh;
 * - kế tiếp: tô tím nhạt, viền tím, cùng phong cách với các ô thường.
 */
const EMPHASIS_STYLE: Record<SeatEmphasis, string> = {
  current:
    'z-10 scale-[1.06] border-[#1E3A8A] bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] text-white shadow-[0_0.5em_1.1em_-0.35em_rgba(29,78,216,0.65)]',
  next: 'z-10 border-[#7C3AED] bg-[#EDE9FE] text-[#4C1D95] shadow-[0_0_0_0.12em_rgba(124,58,237,0.18)]',
};


type SeatCellProps = {
  row: string;
  number: number;
  occupant?: SeatEntry;
  mode: SeatingMode;
  fill: boolean;
  /** MSSV của ô đang được chọn (để xem tên đầy đủ); ô trùng MSSV này được khoanh viền. */
  selectedCode?: string | null;
  /** Có thì ô có người ngồi bấm/chạm được. Nên truyền hàm ổn định (useCallback) để ô không vẽ lại thừa. */
  onSelect?: (occupant: SeatEntry) => void;
};

/**
 * Một ô ghế hình chữ nhật: mã ghế là thông tin chính, tên là phụ, MSSV chỉ hiện ở chế độ quản lý.
 * Kích thước (viền, bo góc, chữ) tính theo `em` nên ô co giãn đều khi đổi độ phân giải.
 */
function SeatCellBase({ row, number, occupant, mode, fill, selectedCode, onSelect }: SeatCellProps) {
  const code = `${row}${formatSeatNumber(number)}`;
  const state = occupant?.state ?? 'empty';
  const emphasis = occupant?.emphasis ?? null;
  const styleClass = emphasis ? EMPHASIS_STYLE[emphasis] : SEAT_STYLE[state];
  const selectable = Boolean(occupant && onSelect);
  const selected = Boolean(occupant && selectedCode && occupant.studentCode === selectedCode);
  return (
    <div
      {...(selectable && occupant
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-pressed': selected,
            onClick: () => onSelect?.(occupant),
            onKeyDown: (event: KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect?.(occupant);
              }
            },
          }
        : {})}
      title={occupant ? `${code} · ${occupant.fullName} (${occupant.studentCode})` : `${code} · trống`}
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-[0.4em] border-[length:max(1px,0.07em)] px-[0.05em] text-center transition-transform ${fill ? 'min-h-0' : 'min-h-[3.2em]'} ${styleClass} ${selectable ? 'cursor-pointer' : ''} ${selected ? 'z-10 outline outline-[0.14em] outline-offset-[0.08em] outline-[#0F172A]' : ''}`}
    >
      <span className={`leading-none tabular-nums ${occupant ? 'text-[1.3em] font-bold tracking-tight' : 'text-[1em] font-medium'}`}>
        {code}
      </span>
      {occupant && (
        <span className='mt-[0.25em] w-full truncate text-[0.8em] font-medium leading-tight'>
          {givenName(occupant.fullName)}
        </span>
      )}
      {occupant && mode === 'management' && (
        <span className='w-full truncate text-[0.65em] leading-tight tabular-nums tracking-tighter opacity-80'>
          {occupant.studentCode}
        </span>
      )}
    </div>
  );
}

/**
 * Dữ liệu được tính lại sau mỗi lần làm mới nên object `occupant` luôn là bản mới;
 * so sánh theo giá trị hiển thị để chỉ ô nào đổi trạng thái mới vẽ lại.
 */
export const SeatCell = memo(SeatCellBase, (prev, next) => {
  const a = prev.occupant;
  const b = next.occupant;
  return (
    prev.row === next.row &&
    prev.number === next.number &&
    prev.mode === next.mode &&
    prev.fill === next.fill &&
    prev.onSelect === next.onSelect &&
    (a?.studentCode === prev.selectedCode) === (b?.studentCode === next.selectedCode) &&
    a?.state === b?.state &&
    a?.emphasis === b?.emphasis &&
    a?.studentCode === b?.studentCode &&
    a?.fullName === b?.fullName
  );
});
