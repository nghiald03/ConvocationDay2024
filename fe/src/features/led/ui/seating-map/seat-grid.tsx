'use client';

import { Fragment } from 'react';
import { SEAT_BLOCKS, SEAT_ROWS, seatKey, type SeatSide } from '../../model/seat-board';
import { SeatCell, type SeatEntry, type SeatingMode } from './seat-cell';

type SeatGridProps = {
  side: SeatSide;
  seats: Map<string, SeatEntry>;
  mode: SeatingMode;
  fill: boolean;
  selectedCode?: string | null;
  onSelect?: (occupant: SeatEntry) => void;
};

/**
 * Lưới ghế: mỗi khối là một CSS Grid, hàng A–J và thứ tự số ghế lấy nguyên từ SEAT_BLOCKS.
 * Cột chữ hàng nằm ở mép ngoài cùng của bên đang xem: mép trái với Bên trái, mép phải với Bên phải.
 */
export function SeatGrid({ side, seats, mode, fill, selectedCode, onSelect }: SeatGridProps) {
  const blocks = SEAT_BLOCKS.filter((block) => block.side === side);
  const labelsOnRight = side === 'Right';
  const labelColumn = 'minmax(0, 0.6fr)'; // chữ dạt ra mép ngoài, cách xa hàng ghế

  return (
    // Toàn màn hình: các hàng ghế giãn đều cho vừa chiều cao còn lại.
    <div className={`flex gap-[clamp(10px,1.2cqw,32px)] ${fill ? 'min-h-0 flex-1' : ''}`}>
      {blocks.map((block, blockIndex) => {
        const withLabels = blockIndex === (labelsOnRight ? blocks.length - 1 : 0);
        const seatColumns = `repeat(${block.numbers.length}, minmax(0, 1fr))`;
        const columns = !withLabels
          ? seatColumns
          : labelsOnRight
            ? `${seatColumns} ${labelColumn}`
            : `${labelColumn} ${seatColumns}`;
        return (
          <div
            key={blockIndex}
            className={`min-w-0 ${fill ? 'flex flex-col' : ''}`}
            style={{ flex: block.numbers.length + (withLabels ? 0.6 : 0) }}
          >
            <div
              className={`grid gap-[clamp(2px,0.25cqw,5px)] text-[clamp(9px,1cqw,24px)] ${fill ? 'min-h-0 flex-1' : ''}`}
              style={{
                gridTemplateColumns: columns,
                ...(fill ? { gridTemplateRows: `repeat(${SEAT_ROWS.length}, minmax(0, 1fr))` } : {}),
              }}
            >
              {SEAT_ROWS.map((row) => {
                const label = withLabels && (
                  <div className={`flex items-center text-[2em] font-extrabold text-black ${labelsOnRight ? 'justify-end' : 'justify-start'}`}>{row}</div>
                );
                return (
                  <Fragment key={row}>
                    {!labelsOnRight && label}
                    {block.numbers.map((number) => (
                      <SeatCell
                        key={number}
                        row={row}
                        number={number}
                        occupant={seats.get(seatKey(row, number))}
                        mode={mode}
                        fill={fill}
                        selectedCode={selectedCode}
                        onSelect={onSelect}
                      />
                    ))}
                    {labelsOnRight && label}
                  </Fragment>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
