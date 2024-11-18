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
    title: 'Check garden watering',
    status: 'Initialized', // Status field in English
    isSystemTask: true, // Indicating if it's a system task
    priority: 'High', // Priority level in English
    isfav: true,
    isTrash: false,
    category: [
      {
        value: 'water',
        label: 'Watering',
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
    title: 'Fertilize fruit trees',
    status: 'In Progress',
    isSystemTask: false,
    priority: 'Medium',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'fertilize',
        label: 'Fertilizing',
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
    title: 'Harvest tomatoes',
    status: 'Done by Staff',
    isSystemTask: false,
    priority: 'High',
    isfav: true,
    isTrash: false,
    category: [
      {
        value: 'harvest',
        label: 'Harvesting',
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
    title: 'Pest inspection',
    status: 'Verified Done by Admin',
    isSystemTask: true,
    priority: 'Low',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'pest',
        label: 'Pest Inspection',
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
    title: 'Check soil moisture',
    status: 'Verification Failed by Admin',
    isSystemTask: false,
    priority: 'Medium',
    isfav: true,
    isTrash: false,
    category: [
      {
        value: 'soil',
        label: 'Soil Moisture Check',
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
    title: 'Replace shading net for leafy greens',
    status: 'Initialized',
    isSystemTask: false,
    priority: 'Medium',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'shade',
        label: 'Shading',
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
    title: 'Prune guava tree',
    status: 'Done by Staff',
    isSystemTask: false,
    priority: 'Low',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'prune',
        label: 'Pruning',
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
    title: 'Check automatic irrigation equipment',
    status: 'In Progress',
    isSystemTask: true,
    priority: 'High',
    isfav: true,
    isTrash: false,
    category: [
      {
        value: 'equipment',
        label: 'Equipment Check',
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
    title: 'Plan additional crop planting',
    status: 'Initialized',
    isSystemTask: false,
    priority: 'High',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'plan',
        label: 'Planning',
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
    title: 'Clean poultry coop',
    status: 'In Progress',
    isSystemTask: true,
    priority: 'Medium',
    isfav: false,
    isTrash: false,
    category: [
      {
        value: 'clean',
        label: 'Cleaning',
      },
    ],
  },
];

export type Todo = (typeof todos)[number];
