import { faker } from '@faker-js/faker';

export const todos = [
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-1.png',
        label: 'Nguyễn Văn A',
        value: 'nguyenvana',
      },
    ],
    title: 'Chăm sóc đàn bò',
    status: 'Initialized',
    isSystemTask: true,
    priority: 'High',
    isfav: true,
    isTrash: false,
    category: [
      {
        value: 'animal-care',
        label: 'Chăm sóc vật nuôi',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-2.png',
        label: 'Trần Văn B',
        value: 'tranvanb',
      },
    ],
    title: 'Cho gà ăn',
    status: 'In Progress',
    isSystemTask: false,
    priority: 'Medium',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'feeding',
        label: 'Cho ăn',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-3.png',
        label: 'Lê Thị C',
        value: 'lethic',
      },
    ],
    title: 'Vệ sinh chuồng lợn',
    status: 'Done by Staff',
    isSystemTask: false,
    priority: 'High',
    isfav: true,
    isTrash: false,
    category: [
      {
        value: 'cleaning',
        label: 'Vệ sinh chuồng trại',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-4.png',
        label: 'Phạm Văn D',
        value: 'phamvand',
      },
    ],
    title: 'Kiểm tra sức khỏe đàn bò',
    status: 'Verified Done by Admin',
    isSystemTask: true,
    priority: 'Low',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'health-check',
        label: 'Kiểm tra sức khỏe',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-5.png',
        label: 'Nguyễn Thị E',
        value: 'nguyenthie',
      },
    ],
    title: 'Tiêm phòng cho đàn heo',
    status: 'Verification Failed by Admin',
    isSystemTask: false,
    priority: 'Medium',
    isfav: true,
    isTrash: false,
    category: [
      {
        value: 'vaccination',
        label: 'Phòng bệnh & Tiêm phòng',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-6.png',
        label: 'Nguyễn Văn F',
        value: 'nguyenvanf',
      },
    ],
    title: 'Quản lý giống bò sữa',
    status: 'Initialized',
    isSystemTask: false,
    priority: 'Medium',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'breeding-management',
        label: 'Quản lý giống',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-7.png',
        label: 'Trần Thị G',
        value: 'tranthig',
      },
    ],
    title: 'Sản xuất thức ăn chăn nuôi',
    status: 'Done by Staff',
    isSystemTask: false,
    priority: 'Low',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'feed-production',
        label: 'Sản xuất thức ăn chăn nuôi',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-8.png',
        label: 'Lê Văn H',
        value: 'levanh',
      },
    ],
    title: 'Theo dõi sinh sản đàn dê',
    status: 'In Progress',
    isSystemTask: true,
    priority: 'High',
    isfav: true,
    isTrash: false,
    category: [
      {
        value: 'reproduction-monitoring',
        label: 'Theo dõi sinh sản',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-9.png',
        label: 'Phan Thị I',
        value: 'phanthii',
      },
    ],
    title: 'Bảo trì thiết bị chăn nuôi',
    status: 'Initialized',
    isSystemTask: false,
    priority: 'High',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'equipment-maintenance',
        label: 'Bảo trì thiết bị',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-10.png',
        label: 'Nguyễn Văn J',
        value: 'nguyenvanj',
      },
    ],
    title: 'Quản lý kho thức ăn và thuốc',
    status: 'In Progress',
    isSystemTask: true,
    priority: 'Medium',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'inventory-management',
        label: 'Quản lý kho thức ăn & thuốc',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-11.png',
        label: 'Nguyễn Văn K',
        value: 'nguyenvank',
      },
    ],
    title: 'Chuẩn bị thức ăn cho đàn vịt',
    status: 'Initialized',
    isSystemTask: true,
    priority: 'Medium',
    isfav: true,
    isTrash: false,
    category: [
      {
        value: 'feeding',
        label: 'Cho ăn',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-12.png',
        label: 'Trần Thị L',
        value: 'tranthil',
      },
    ],
    title: 'Vệ sinh chuồng bò',
    status: 'In Progress',
    isSystemTask: false,
    priority: 'Low',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'cleaning',
        label: 'Vệ sinh chuồng trại',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-13.png',
        label: 'Lê Văn M',
        value: 'levanm',
      },
    ],
    title: 'Tiêm phòng cho lợn nái',
    status: 'Done by Staff',
    isSystemTask: false,
    priority: 'High',
    isfav: true,
    isTrash: false,
    category: [
      {
        value: 'vaccination',
        label: 'Phòng bệnh & Tiêm phòng',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-14.png',
        label: 'Phạm Văn N',
        value: 'phamvann',
      },
    ],
    title: 'Kiểm tra sức khỏe cho dê',
    status: 'Verified Done by Admin',
    isSystemTask: true,
    priority: 'Low',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'health-check',
        label: 'Kiểm tra sức khỏe',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-15.png',
        label: 'Nguyễn Thị O',
        value: 'nguyenthio',
      },
    ],
    title: 'Sản xuất thức ăn chăn nuôi tổng hợp',
    status: 'Verification Failed by Admin',
    isSystemTask: false,
    priority: 'Medium',
    isfav: true,
    isTrash: false,
    category: [
      {
        value: 'feed-production',
        label: 'Sản xuất thức ăn chăn nuôi',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-16.png',
        label: 'Nguyễn Văn P',
        value: 'nguyenvanp',
      },
    ],
    title: 'Theo dõi sinh sản đàn bò',
    status: 'Initialized',
    isSystemTask: false,
    priority: 'Medium',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'reproduction-monitoring',
        label: 'Theo dõi sinh sản',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-17.png',
        label: 'Trần Thị Q',
        value: 'tranthiq',
      },
    ],
    title: 'Bảo trì máy bơm nước tự động',
    status: 'Done by Staff',
    isSystemTask: false,
    priority: 'Low',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'equipment-maintenance',
        label: 'Bảo trì thiết bị',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-18.png',
        label: 'Lê Văn R',
        value: 'levanr',
      },
    ],
    title: 'Kiểm kê kho thức ăn',
    status: 'In Progress',
    isSystemTask: true,
    priority: 'High',
    isfav: true,
    isTrash: false,
    category: [
      {
        value: 'inventory-management',
        label: 'Quản lý kho thức ăn & thuốc',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-19.png',
        label: 'Phan Thị S',
        value: 'phanthis',
      },
    ],
    title: 'Kiểm tra sức khỏe cho đàn gia cầm',
    status: 'Initialized',
    isSystemTask: false,
    priority: 'High',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'health-check',
        label: 'Kiểm tra sức khỏe',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-20.png',
        label: 'Nguyễn Văn T',
        value: 'nguyenvant',
      },
    ],
    title: 'Quản lý giống gà đẻ trứng',
    status: 'In Progress',
    isSystemTask: true,
    priority: 'Medium',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'breeding-management',
        label: 'Quản lý giống',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-21.png',
        label: 'Trần Thị U',
        value: 'tranthiu',
      },
    ],
    title: 'Vệ sinh chuồng trại hàng tuần',
    status: 'Done by Staff',
    isSystemTask: false,
    priority: 'Low',
    isfav: true,
    isTrash: false,
    category: [
      {
        value: 'cleaning',
        label: 'Vệ sinh chuồng trại',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-22.png',
        label: 'Lê Văn V',
        value: 'levanv',
      },
    ],
    title: 'Phân loại thức ăn dự trữ',
    status: 'Verification Failed by Admin',
    isSystemTask: false,
    priority: 'Medium',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'inventory-management',
        label: 'Quản lý kho thức ăn & thuốc',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-23.png',
        label: 'Nguyễn Thị W',
        value: 'nguyenthiw',
      },
    ],
    title: 'Kiểm tra hệ thống cung cấp nước',
    status: 'Initialized',
    isSystemTask: true,
    priority: 'High',
    isfav: true,
    isTrash: false,
    category: [
      {
        value: 'equipment-maintenance',
        label: 'Bảo trì thiết bị',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-24.png',
        label: 'Trần Văn X',
        value: 'tranvanx',
      },
    ],
    title: 'Chuẩn bị tiêm phòng cho gia cầm',
    status: 'In Progress',
    isSystemTask: false,
    priority: 'Low',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'vaccination',
        label: 'Phòng bệnh & Tiêm phòng',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-25.png',
        label: 'Lê Thị Y',
        value: 'lethiy',
      },
    ],
    title: 'Kiểm tra dinh dưỡng của thức ăn',
    status: 'Done by Staff',
    isSystemTask: false,
    priority: 'Medium',
    isfav: true,
    isTrash: false,
    category: [
      {
        value: 'feed-production',
        label: 'Sản xuất thức ăn chăn nuôi',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-26.png',
        label: 'Nguyễn Văn Z',
        value: 'nguyenvanz',
      },
    ],
    title: 'Theo dõi sinh sản đàn vịt',
    status: 'Initialized',
    isSystemTask: true,
    priority: 'High',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'reproduction-monitoring',
        label: 'Theo dõi sinh sản',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-27.png',
        label: 'Trần Thị AA',
        value: 'tranthiaa',
      },
    ],
    title: 'Tiêm phòng cho gia súc',
    status: 'Verification Failed by Admin',
    isSystemTask: false,
    priority: 'Low',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'vaccination',
        label: 'Phòng bệnh & Tiêm phòng',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-28.png',
        label: 'Lê Văn BB',
        value: 'levanbb',
      },
    ],
    title: 'Kiểm tra sức khỏe cho cừu',
    status: 'In Progress',
    isSystemTask: true,
    priority: 'Medium',
    isfav: true,
    isTrash: false,
    category: [
      {
        value: 'health-check',
        label: 'Kiểm tra sức khỏe',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-29.png',
        label: 'Nguyễn Thị CC',
        value: 'nguyenthicc',
      },
    ],
    title: 'Quản lý giống bò thịt',
    status: 'Done by Staff',
    isSystemTask: false,
    priority: 'High',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'breeding-management',
        label: 'Quản lý giống',
      },
    ],
  },
  {
    id: faker.string.uuid(),
    image: [
      {
        image: '/images/avatar/avatar-30.png',
        label: 'Trần Văn DD',
        value: 'tranvandd',
      },
    ],
    title: 'Vệ sinh thiết bị chăn nuôi',
    status: 'Initialized',
    isSystemTask: false,
    priority: 'High',
    isfav: true,
    isTrash: false,
    category: [
      {
        value: 'equipment-maintenance',
        label: 'Bảo trì thiết bị',
      },
    ],
  },
];

export type Todo = (typeof todos)[number];
