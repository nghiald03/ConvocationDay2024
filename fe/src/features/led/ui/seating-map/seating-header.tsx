'use client';

/** Chỉ có tên bên (Bên trái / Bên phải), nằm sát mép cùng phía với bên đang hiển thị. */
export function SeatingHeader({ title, align }: { title: string; align: 'left' | 'right' }) {
  return (
    <header className={`mb-[1.2cqw] shrink-0 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <h1 className='text-[clamp(22px,2.9cqw,64px)] font-extrabold uppercase leading-none tracking-wide text-[#1E293B]'>
        {title}
      </h1>
    </header>
  );
}
