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
  /** Vai trò được thấy và truy cập mục này; không đặt thì theo vai trò của cả nhóm. */
  roleAccess?: string[];
};

export type Group = {
  groupLabel: string;
  roleAccess?: string[];
  menus: Menu[];
  id: string;
};

/** Vai trò được thấy một mục: theo `roleAccess` của mục nếu có, không thì theo của nhóm; cả hai đều không đặt thì ai cũng thấy. */
export function canAccessMenu(
  group: Pick<Group, 'roleAccess'>,
  menu: Pick<Menu, 'roleAccess'>,
  role: string,
): boolean {
  const allowed = menu.roleAccess ?? group.roleAccess;
  return !allowed || allowed.includes(role);
}

export function getMenuList(pathname: string): Group[] {
  return [
    {
      groupLabel: "",
      id: "dashboard",
      roleAccess: ["MN", "CK", "CL", "MC", "US", "NO", "PQ", "PC"],
      menus: [
        {
          id: "dashboard",
          href: "/tutorial",
          label: "Tổng quan hệ thống",
          active: pathname.includes("/tutorial"),
          icon: "heroicons-outline:home",
          submenus: [],
        },
      ],
    },
    // {
    //   groupLabel: "Thông báo",
    //   id: "notification",
    //   roleAccess: ["MN", "NO"],
    //   menus: [
    //     {
    //       id: "notification-display",
    //       href: "/notification-display",
    //       label: "Hiển thị thông báo",
    //       active: pathname === "/notification-display",
    //       icon: "heroicons-outline:speaker-wave",
    //       submenus: [],
    //     },
    //     {
    //       id: "notification-display-lite",
    //       href: "/notification-display/lite",
    //       label: "Hiển thị thông báo Lite",
    //       active: pathname === "/notification-display/lite",
    //       icon: "heroicons-outline:speaker-wave",
    //       submenus: [],
    //     },
    //   ],
    // },

    {
      groupLabel: "Trình chiếu LED",
      id: "ledVisual",
      // US có cùng quyền led.control với MC nên dùng chung nhóm này.
      roleAccess: ["MC", "US", "MN"],
      menus: [
        {
          id: "MCController",
          href: "/led/mc-controller",
          label: "MC Điều khiển",
          active: pathname.includes("/led/mc-controller"),
          icon: "mdi:controller-right",
          submenus: [],
        },
        {
          id: "ledQueue",
          href: "/led/queue",
          label: "Hàng đợi LED",
          active: pathname.includes("/led/queue"),
          icon: "mdi:format-list-numbered",
          submenus: [],
        },
        {
          id: "ledScreen",
          href: "/led/led-screen",
          label: "Trình chiếu LED",
          active: pathname.includes("/led/led-screen"),
          icon: "material-symbols-light:media-link-outline",
          submenus: [],
        },
        {
          id: "ledProgress",
          href: "/led/progress",
          label: "Tiến độ chiếu LED",
          active: pathname.includes("/led/progress"),
          icon: "mdi:progress-clock",
          submenus: [],
        },
        {
          id: "seatLive",
          href: "/led/seat-live",
          label: "Sơ đồ ghế trực tiếp",
          active: pathname.includes("/led/seat-live"),
          icon: "mdi:seat-outline",
          submenus: [],
        },
        // Ẩn khỏi menu: "Sơ đồ chỗ ngồi" và "Sơ đồ chỗ ngồi 2" (đã có "Sơ đồ ghế trực tiếp" ở nhóm này).
        // {
        //   id: "seat-map",
        //   href: "/seatingArrangement/seat-map",
        //   label: "Sơ đồ chỗ ngồi",
        //   active: pathname.includes("/seatingArrangement/seat-map"),
        //   icon: "mdi:seat-outline",
        //   submenus: [],
        // },
        // {
        //   id: "chongoi",
        //   href: "/seatingArrangement/chongoi",
        //   label: "Sơ đồ chỗ ngồi 2",
        //   active: pathname.includes("/seatingArrangement/chongoi"),
        //   icon: "mdi:map-outline",
        //   submenus: [],
        // },
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

    // {
    //   groupLabel: 'Chụp ảnh',
    //   id: 'photoQueue',
    //   roleAccess: ['MN', 'PQ', 'PC'],
    //   menus: [
    //     {
    //       id: 'photoQueueKiosk',
    //       href: '/photo-queue/kiosk',
    //       label: 'Bấm số chụp ảnh',
    //       active: pathname.includes('/photo-queue/kiosk'),
    //       icon: 'lucide:ticket-plus',
    //       submenus: [],
    //     },
    //     {
    //       id: 'photoQueueCoordinator',
    //       href: '/photo-queue/coordinator',
    //       label: 'Điều phối chụp ảnh',
    //       active: pathname.includes('/photo-queue/coordinator'),
    //       icon: 'lucide:panel-top',
    //       submenus: [],
    //     },
    //   ],
    // },
    {
      groupLabel: "Check in",
      id: "checkin",
      roleAccess: ["CK", "CL", "MN"],
      menus: [
        {
          id: "checkin",
          href: "/checkin/manual",
          label: "Checkin",
          active: pathname.includes("/checkin/manual"),
          icon: "mdi:user-check-outline",
          submenus: [],
        },
        {
          id: "lateQueue",
          href: "/checkin/late-queue",
          label: "Danh sách đến trễ",
          active: pathname.includes("/checkin/late-queue"),
          icon: "mdi:clock-alert-outline",
          submenus: [],
          // Ẩn với CK (người check-in); chỉ trưởng check-in (CL) và Manager (MN) điều phối người đến trễ.
          roleAccess: ["CL", "MN"],
        },
        {
          id: "seat-board",
          href: "/led/seat-board",
          label: "Sơ đồ check-in đầu giờ",
          active: pathname.includes("/led/seat-board"),
          icon: "mdi:seat-outline",
          submenus: [],
        },
      ],
    },

    {
      groupLabel: "Quản lý",
      roleAccess: ["MN"],
      id: "management",
      menus: [
        {
          id: "manage-bachelor",
          href: "/manage/manage-bachelor",
          label: "Quản lí danh sách TCN",
          active: pathname.includes("/manage/manage-bachelor"),
          icon: "lucide:user-cog",
          submenus: [],
        },
        {
          id: "checkinManagement",
          href: "/manage/checkin-management",
          label: "Quản lí checkin",
          active: pathname.includes("/manage/checkin-management"),
          icon: "flowbite:badge-check-outline",
          submenus: [],
        },
        {
          id: "notification",
          href: "/notify",
          label: "Thông báo",
          active: pathname === "/notify",
          icon: "heroicons-outline:bell",
          submenus: [],
        },
        {
          id: "stastistics",
          href: "/statistics/hall-overview",
          label: "Thống kê",
          active: pathname.includes("/statistics/hall-overview"),
          icon: "mdi:chart-bar",
          submenus: [],
        },
        {
          id: "hall",
          href: "/manage/hall",
          label: "Quản lí DS Side",
          active: pathname.includes("/manage/hall"),
          icon: "fluent-mdl2:settings",
          submenus: [],
        },
        {
          id: "session",
          href: "/manage/session",
          label: "Quản lí DS Session",
          active: pathname.includes("/manage/session"),
          icon: "carbon:prompt-session",
          submenus: [],
        },
        {
          id: "users",
          href: "/manage/users",
          label: "Quản lí tài khoản",
          active: pathname.includes("/manage/users"),
          icon: "heroicons-outline:users",
          submenus: [],
        },
        {
          id: "auditLog",
          href: "/manage/audit-log",
          label: "Nhật ký thao tác",
          active: pathname.includes("/manage/audit-log"),
          icon: "heroicons-outline:clipboard-document-list",
          submenus: [],
        },
        {
          id: "uploadFileImage",
          href: "/manage/upload-file",
          label: "Upload file ảnh",
          active: pathname.includes("/manage/upload-file"),
          icon: "line-md:image",
          submenus: [],
        },
        {
          id: "dangerous",
          href: "/manage/dangerous",
          label: "NGUY HIỂM",
          active: pathname.includes("/manage/dangerous"),
          icon: "bx:bxs-virus",
          submenus: [],
        },
      ],
    },
  ];
}
