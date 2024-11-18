import { faker } from '@faker-js/faker';

const date = new Date();
const prevDay = new Date().getDate() - 1;
const nextDay = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);

// prettier-ignore
const nextMonth = date.getMonth() === 11 ? new Date(date.getFullYear() + 1, 0, 1) : new Date(date.getFullYear(), date.getMonth() + 1, 1)
// prettier-ignore
const prevMonth = date.getMonth() === 11 ? new Date(date.getFullYear() - 1, 0, 1) : new Date(date.getFullYear(), date.getMonth() - 1, 1)
export const calendarEvents = [
  {
    id: faker.string.uuid(),
    title: 'Kiểm tra sức khỏe vật nuôi',
    start: date,
    end: nextDay,
    allDay: false,
    extendedProps: {
      calendar: 'health-check',
    },
  },
  {
    id: faker.string.uuid(),
    title: 'Cho ăn sáng',
    start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 0),
    end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0),
    allDay: false,
    extendedProps: {
      calendar: 'feeding',
    },
  },
  {
    id: faker.string.uuid(),
    title: 'Vệ sinh chuồng trại',
    start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0),
    end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 11, 30),
    allDay: false,
    extendedProps: {
      calendar: 'cleaning',
    },
  },
  {
    id: faker.string.uuid(),
    title: 'Kiểm tra sinh sản',
    start: new Date(date.getFullYear(), date.getMonth() + 1, -11),
    end: new Date(date.getFullYear(), date.getMonth() + 1, -10),
    allDay: true,
    extendedProps: {
      calendar: 'reproduction-monitoring',
    },
  },
  {
    id: faker.string.uuid(),
    title: 'Tiêm phòng định kỳ',
    start: new Date(date.getFullYear(), date.getMonth() + 1, -13),
    end: new Date(date.getFullYear(), date.getMonth() + 1, -12),
    allDay: true,
    extendedProps: {
      calendar: 'vaccination',
    },
  },
  {
    id: faker.string.uuid(),
    title: 'Quản lý kho thức ăn',
    start: nextMonth,
    end: nextMonth,
    allDay: true,
    extendedProps: {
      calendar: 'inventory-management',
    },
  },
  {
    id: faker.string.uuid(),
    title: 'Bảo trì thiết bị chăn nuôi',
    start: new Date(date.getFullYear(), date.getMonth() + 1, -5),
    end: new Date(date.getFullYear(), date.getMonth() + 1, -4),
    allDay: true,
    extendedProps: {
      calendar: 'equipment-maintenance',
    },
  },
  {
    id: faker.string.uuid(),
    title: 'Sản xuất thức ăn chăn nuôi',
    start: new Date(date.getFullYear(), date.getMonth() + 1, -2),
    end: new Date(date.getFullYear(), date.getMonth() + 1, -1),
    allDay: true,
    extendedProps: {
      calendar: 'feed-production',
    },
  },
  {
    id: faker.string.uuid(),
    title: 'Chăm sóc vật nuôi chiều',
    start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 15, 0),
    end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 16, 0),
    allDay: false,
    extendedProps: {
      calendar: 'animal-care',
    },
  },
];

export const calendarCategories = [
  {
    label: 'Chăm sóc vật nuôi',
    value: 'animal-care',
    activeClass: 'ring-green-500 bg-green-500',
    className: 'group-hover:border-green-500',
  },
  {
    label: 'Cho ăn',
    value: 'feeding',
    activeClass: 'ring-blue-500 bg-blue-500',
    className: 'group-hover:border-blue-500',
  },
  {
    label: 'Vệ sinh chuồng trại',
    value: 'cleaning',
    activeClass: 'ring-gray-500 bg-gray-500',
    className: 'group-hover:border-gray-500',
  },
  {
    label: 'Kiểm tra sức khỏe',
    value: 'health-check',
    activeClass: 'ring-red-500 bg-red-500',
    className: 'group-hover:border-red-500',
  },
  {
    label: 'Phòng bệnh & Tiêm phòng',
    value: 'vaccination',
    activeClass: 'ring-orange-500 bg-orange-500',
    className: 'group-hover:border-orange-500',
  },
  {
    label: 'Quản lý giống',
    value: 'breeding-management',
    activeClass: 'ring-purple-500 bg-purple-500',
    className: 'group-hover:border-purple-500',
  },
  {
    label: 'Sản xuất thức ăn chăn nuôi',
    value: 'feed-production',
    activeClass: 'ring-yellow-500 bg-yellow-500',
    className: 'group-hover:border-yellow-500',
  },
  {
    label: 'Theo dõi sinh sản',
    value: 'reproduction-monitoring',
    activeClass: 'ring-pink-500 bg-pink-500',
    className: 'group-hover:border-pink-500',
  },
  {
    label: 'Bảo trì thiết bị',
    value: 'equipment-maintenance',
    activeClass: 'ring-teal-500 bg-teal-500',
    className: 'group-hover:border-teal-500',
  },
  {
    label: 'Quản lý kho thức ăn & thuốc',
    value: 'inventory-management',
    activeClass: 'ring-indigo-500 bg-indigo-500',
    className: 'group-hover:border-indigo-500',
  },
];

export const categories = [
  {
    label: 'Chăm sóc vật nuôi',
    value: 'animal-care',
    className:
      'data-[state=checked]:bg-green-500 data-[state=checked]:ring-green-500',
  },
  {
    label: 'Cho ăn',
    value: 'feeding',
    className:
      'data-[state=checked]:bg-blue-500 data-[state=checked]:ring-blue-500',
  },
  {
    label: 'Vệ sinh chuồng trại',
    value: 'cleaning',
    className:
      'data-[state=checked]:bg-gray-500 data-[state=checked]:ring-gray-500',
  },
  {
    label: 'Kiểm tra sức khỏe',
    value: 'health-check',
    className:
      'data-[state=checked]:bg-red-500 data-[state=checked]:ring-red-500',
  },
  {
    label: 'Phòng bệnh & Tiêm phòng',
    value: 'vaccination',
    className:
      'data-[state=checked]:bg-orange-500 data-[state=checked]:ring-orange-500',
  },
  {
    label: 'Quản lý giống',
    value: 'breeding-management',
    className:
      'data-[state=checked]:bg-purple-500 data-[state=checked]:ring-purple-500',
  },
  {
    label: 'Sản xuất thức ăn chăn nuôi',
    value: 'feed-production',
    className:
      'data-[state=checked]:bg-yellow-500 data-[state=checked]:ring-yellow-500',
  },
  {
    label: 'Theo dõi sinh sản',
    value: 'reproduction-monitoring',
    className:
      'data-[state=checked]:bg-pink-500 data-[state=checked]:ring-pink-500',
  },
  {
    label: 'Bảo trì thiết bị',
    value: 'equipment-maintenance',
    className:
      'data-[state=checked]:bg-teal-500 data-[state=checked]:ring-teal-500',
  },
  {
    label: 'Quản lý kho thức ăn & thuốc',
    value: 'inventory-management',
    className:
      'data-[state=checked]:bg-indigo-500 data-[state=checked]:ring-indigo-500',
  },
];

export type CalendarEvent = (typeof calendarEvents)[number];
export type CalendarCategory = (typeof calendarCategories)[number];
export type Category = (typeof categories)[number];
