export type SubChildren = {
  href: string;
  label: string;
  active: boolean;
  children?: SubChildren[];
};
export type Submenu = {
  href: string;
  label: string;
  active: boolean;
  icon: any;
  submenus?: Submenu[];
  children?: SubChildren[];
};

export type Menu = {
  href: string;
  label: string;
  active: boolean;
  icon: any;
  submenus: Submenu[];
  id: string;
};

export type Group = {
  groupLabel: string;
  roleAccess?: string[];
  menus: Menu[];
  id: string;
};

export function getMenuList(pathname: string): Group[] {
  return [
    {
      groupLabel: '',
      id: 'dashboard',
      roleAccess: ['MN', 'CK', 'MC', 'US', 'NO'],
      menus: [
        {
          id: 'dashboard',
          href: '/tutorial',
          label: 'Tổng quan hệ thống',
          active: pathname.includes('/tutorial'),
          icon: 'heroicons-outline:home',
          submenus: [],
        },
      ],
    },
    {
      groupLabel: 'Thông báo',
      id: 'notification',
      roleAccess: ['MN', 'CK', 'MC', 'US', 'NO'],
      menus: [
        {
          id: 'notification',
          href: '/notify',
          label: 'Thông báo',
          active: pathname === '/notify',
          icon: 'heroicons-outline:bell',
          submenus: [],
        },
        {
          id: 'notification',
          href: '/notify/current-number',
          label: 'Gọi số chụp ảnh',
          active: pathname === '/notify/current-number',
          icon: 'heroicons-outline:phone-arrow-up-right',
          submenus: [],
        },
        {
          id: 'notification-display',
          href: '/notification-display',
          label: 'Hiển thị thông báo',
          active: pathname === '/notification-display',
          icon: 'heroicons-outline:speaker-wave',
          submenus: [],
        },
        {
          id: 'notification-display-lite',
          href: '/notification-display/lite',
          label: 'Hiển thị thông báo Lite',
          active: pathname === '/notification-display/lite',
          icon: 'heroicons-outline:speaker-wave',
          submenus: [],
        },
      ],
    },

    {
      groupLabel: 'Trình chiếu LED',
      id: 'ledVisual',
      roleAccess: ['MC', 'MN'],
      menus: [
        {
          id: 'MCController',
          href: '/led/mc-controller',
          label: 'MC Điều khiển',
          active: pathname.includes('/led/mc-controller'),
          icon: 'mdi:controller-right',
          submenus: [],
        },
        {
          id: 'ledScreen',
          href: '/led/led-screen',
          label: 'Trình chiếu LED',
          active: pathname.includes('/led/led-screen'),
          icon: 'material-symbols-light:media-link-outline',
          submenus: [],
        },
        {
          id: 'seat-map',
          href: '/seatingArrangement/seat-map',
          label: 'Sơ đồ chỗ ngồi',
          active: pathname.includes('/seatingArrangement/seat-map'),
          icon: 'mdi:seat-outline',
          submenus: [],
        },
      ],
    },
    // {
    //   groupLabel: 'Điều phối chỗ ngồi',
    //   id: 'seatingArrangement',
    //   roleAccess: ['MN', 'US', 'CK'],
    //   menus: [
    //     {
    //       id: 'bachlorMissingSession',
    //       href: '/seatingArrangement/bachelorMissingSession',
    //       label: 'Tra cứu chỗ ngồi TCN tham gia bù',
    //       active: pathname.includes(
    //         '/seatingArrangement/bachelorMissingSession'
    //       ),
    //       icon: 'icon-park-twotone:bachelor-cap-one',
    //       submenus: [],
    //     },
    //     {
    //       id: 'location',
    //       href: '/seatingArrangement/seatLocation',
    //       label: 'Tra cứu vị trí chỗ ngồi',
    //       active: pathname.includes('/seatingArrangement/seatLocation'),
    //       icon: 'mdi:seat-outline',
    //       submenus: [],
    //     },
    //   ],
    // },

    {
      groupLabel: 'Check in',
      id: 'checkin',
      roleAccess: ['CK', 'MN'],
      menus: [
        {
          id: 'checkin',
          href: '/checkin/manual',
          label: 'Checkin',
          active: pathname.includes('/checkin/manual'),
          icon: 'mdi:user-check-outline',
          submenus: [],
        },
      ],
    },

    {
      groupLabel: 'Quản lý',
      roleAccess: ['MN'],
      id: 'management',
      menus: [
        {
          id: 'manage-bachelor',
          href: '/manage/manage-bachelor',
          label: 'Quản lí danh sách TCN',
          active: pathname.includes('/manage/manage-bachelor'),
          icon: 'lucide:user-cog',
          submenus: [],
        },
        {
          id: 'stastistics',
          href: '/statistics/hall-overview',
          label: 'Thống kê',
          active: pathname.includes('/statistics/hall-overview'),
          icon: 'mdi:chart-bar',
          submenus: [],
        },
        // {
        //   id: 'hall',
        //   href: '/manage/hall',
        //   label: 'Quản lí DS Hội trường',
        //   active: pathname.includes('/manage/hall'),
        //   icon: 'fluent-mdl2:settings',
        //   submenus: [],
        // },
        // {
        //   id: 'session',
        //   href: '/app/session',
        //   label: 'Quản lí DS Session',
        //   active: pathname.includes('/manage/session'),
        //   icon: 'carbon:prompt-session',
        //   submenus: [],
        // },
        {
          id: 'checkinManagement',
          href: '/manage/checkin-management',
          label: 'Quản lí checkin',
          active: pathname.includes('/manage/checkin-management'),
          icon: 'flowbite:badge-check-outline',
          submenus: [],
        },
        {
          id: 'uploadFileImage',
          href: '/manage/upload-file',
          label: 'Upload file ảnh',
          active: pathname.includes('/manage/upload-file'),
          icon: 'line-md:image',
          submenus: [],
        },
        {
          id: 'dangerous',
          href: '/manage/dangerous',
          label: 'NGUY HIỂM',
          active: pathname.includes('/manage/dangerous'),
          icon: 'bx:bxs-virus',
          submenus: [],
        },
      ],
    },
  ];
}
