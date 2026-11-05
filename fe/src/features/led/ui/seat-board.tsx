'use client';

import { Fragment } from 'react';
import {
  SEAT_BLOCKS,
  SEAT_ROWS,
  buildSeatBoard,
  formatSeatNumber,
  givenName,
  seatKey,
  sideOfChair,
  type SeatOccupant,
  type SeatSide,
  type SeatState,
} from '../model/seat-board';

const STATE_CLASS: Record<SeatState | 'empty', string> = {
  present: 'bg-emerald-500 border-emerald-600 text-white',
  late: 'bg-amber-400 border-amber-500 text-amber-950',
  waiting: 'bg-white border-slate-300 text-slate-600',
  absent: 'bg-rose-100 border-rose-300 text-rose-700',
  empty: 'bg-transparent border-dashed border-slate-300/70 text-slate-300',
};

export const SEAT_LEGEND: { state: SeatState | 'empty'; label: string }[] = [
  { state: 'present', label: 'Đã check-in' },
  { state: 'late', label: 'Check-in trễ / force' },
  { state: 'waiting', label: 'Chưa check-in' },
  { state: 'absent', label: 'Vắng (đã khóa phiên)' },
  { state: 'empty', label: 'Ghế trống' },
];

export function SeatLegend({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-sm ${className}`}>
      {SEAT_LEGEND.map((item) => (
        <span key={item.state} className='flex items-center gap-2'>
          <span className={`inline-block h-4 w-4 rounded border ${STATE_CLASS[item.state]}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Lưới ghế một bên theo bản in cũ: sân khấu ở trên, Left 25–50 hoặc Right 24–01.
 * Mỗi ô ghi số ghế, tên gọi và MSSV của tân cử nhân.
 */
export function SeatBoard({ occupants, side }: { occupants: SeatOccupant[]; side: SeatSide }) {
  const board = buildSeatBoard(occupants);
  const summary = board.summary[side];
  const blocks = SEAT_BLOCKS.filter((block) => block.side === side);
  const outside = board.outside.filter((seat) => sideOfChair(seat.chair) === side);
  const percent = summary.total ? Math.round((summary.checkedIn / summary.total) * 100) : 0;

  return (
    <div className='w-full'>
      <div className='mb-3 rounded-md bg-gradient-to-r from-orange-600 to-orange-500 py-2 text-center text-xl font-extrabold uppercase tracking-[0.3em] text-white shadow'>
        Sân khấu chính
      </div>

      <div className='mb-2 flex items-baseline justify-between gap-2 px-1'>
        <span className='text-2xl font-extrabold uppercase tracking-wider text-slate-800'>
          Side {summary.hallName ?? side}
        </span>
        <span className='text-xl tabular-nums text-slate-700'>
          Đã check-in <b className='text-emerald-700'>{summary.checkedIn}</b>/{summary.total} ({percent}%)
          {summary.late > 0 && <span className='ml-3 text-amber-700'>trễ {summary.late}</span>}
        </span>
      </div>

      <div className='flex gap-3'>
        {blocks.map((block, blockIndex) => {
          const withLabels = blockIndex === 0;
          return (
            <div key={blockIndex} className='min-w-0' style={{ flex: block.numbers.length + (withLabels ? 0.6 : 0) }}>
              <div className='mb-1 rounded border border-slate-300 bg-white py-0.5 text-center text-xs font-semibold tracking-widest text-slate-500'>
                BÀN
              </div>
              <div className='mb-1 rounded border border-yellow-300 bg-yellow-100 py-0.5 text-center text-xs font-bold tracking-widest text-yellow-900'>
                ĐẠI BIỂU
              </div>
              <div
                className='grid gap-[3px]'
                style={{
                  gridTemplateColumns: `${withLabels ? 'minmax(0, 0.6fr) ' : ''}repeat(${block.numbers.length}, minmax(0, 1fr))`,
                }}
              >
                {SEAT_ROWS.map((row) => (
                  <Fragment key={row}>
                    {withLabels && (
                      <div className='flex items-center justify-center text-[clamp(10px,1vw,20px)] font-bold text-slate-500'>
                        {row}
                      </div>
                    )}
                    {block.numbers.map((number) => {
                      const occupant = board.seats.get(seatKey(row, number));
                      const state = occupant?.state ?? 'empty';
                      return (
                        <div
                          key={number}
                          title={occupant ? `${row}${number} · ${occupant.fullName} (${occupant.studentCode})` : `${row}${number} · trống`}
                          className={`flex min-h-[3.4em] flex-col items-center justify-center overflow-hidden rounded-[3px] border px-[1px] py-[2px] text-center leading-tight text-[clamp(8px,0.8vw,16px)] ${STATE_CLASS[state]}`}
                        >
                          <span className='text-[0.85em] tabular-nums opacity-80'>
                            {row}
                            {formatSeatNumber(number)}
                          </span>
                          {occupant && (
                            <>
                              <span className='w-full truncate font-bold'>{givenName(occupant.fullName)}</span>
                              <span className='w-full truncate text-[0.8em] tabular-nums opacity-80'>
                                {occupant.studentCode}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {outside.length > 0 && (
        <div className='mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2'>
          <div className='mb-1 text-sm font-bold text-amber-800'>
            Ghế cuối (check-in trễ, hàng Z): {outside.length}
          </div>
          <div className='flex flex-wrap gap-1'>
            {outside.map((seat) => (
              <span
                key={seat.studentCode}
                title={`${seat.fullName} (${seat.studentCode})`}
                className={`rounded border px-1.5 py-0.5 text-xs font-semibold ${STATE_CLASS[seat.state]}`}
              >
                {seat.chair} · {givenName(seat.fullName)} · {seat.studentCode}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
