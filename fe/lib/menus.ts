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
          active: pathname.includes('/notify'),
          icon: 'heroicons-outline:bell',
          submenus: [],
        },
        {
          id: 'notification',
          href: '/notify/current-number',
          label: 'Gọi số chụp ảnh',
          active: pathname.includes('/notify/current-number'),
          icon: 'heroicons-outline:phone-arrow-up-right',
          submenus: [],
        },
        {
          id: 'notification-display',
          href: '/notification-display',
          label: 'Hiển thị thông báo',
          active: pathname.includes('/notification-display'),
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
        // {
        //   id: 'smart-checkin',
        //   href: '/checkin/checkinWithQR',
        //   label: 'Checkin với QR',
        //   active: pathname.includes('/checkinWithQR'),
        //   icon: 'gg:qr',
        //   submenus: [],
        // },
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

    // {
    //   groupLabel: t('elements'),
    //   id: 'components',
    //   menus: [
    //     {
    //       id: 'components',
    //       href: '/components/avatar',
    //       label: t('components'),
    //       active: pathname.includes('/components'),
    //       icon: 'heroicons-outline:collection',
    //       submenus: [
    //         {
    //           href: '/components/avatar',
    //           label: t('avatar'),
    //           active: pathname === '/components/avatar',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/alert',
    //           label: t('alert'),
    //           active: pathname === '/components/alert',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/alert-dialog',
    //           label: t('alertDialog'),
    //           active: pathname === '/components/alert-dialog',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/accordion',
    //           label: t('accordion'),
    //           active: pathname === '/components/accordion',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/badge',
    //           label: t('badge'),
    //           active: pathname === '/components/badge',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/breadcrumb',
    //           label: t('breadcrumb'),
    //           active: pathname === '/components/breadcrumb',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/button',
    //           label: t('button'),
    //           active: pathname === '/components/button',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/calendar',
    //           label: t('calendar'),
    //           active: pathname === '/components/calendar',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/card',
    //           label: t('card'),
    //           active: pathname === '/components/card',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/carousel',
    //           label: t('carousel'),
    //           active: pathname === '/components/carousel',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/collapsible',
    //           label: t('collapsible'),
    //           active: pathname === '/components/collapsible',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/context-menu',
    //           label: t('contextMenu'),
    //           active: pathname === '/components/context-menu',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/dialog',
    //           label: t('dialog'),
    //           active: pathname === '/components/dialog',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/drawer',
    //           label: t('drawer'),
    //           active: pathname === '/components/drawer',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/dropdown',
    //           label: t('dropdown'),
    //           active: pathname === '/components/dropdown',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/hover-card',
    //           label: t('hoverCard'),
    //           active: pathname === '/components/hover-card',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/menu-bar',
    //           label: t('menuBar'),
    //           active: pathname === '/components/menu-bar',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/navigation-menu',
    //           label: t('navigationMenu'),
    //           active: pathname === '/components/navigation-menu',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/pagination',
    //           label: t('pagination'),
    //           active: pathname === '/components/pagination',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/popover',
    //           label: t('popover'),
    //           active: pathname === '/components/popover',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/progress',
    //           label: t('progress'),
    //           active: pathname === '/components/progress',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/resizable',
    //           label: t('resizable'),
    //           active: pathname === '/components/resizable',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/scroll-area',
    //           label: t('scrollArea'),
    //           active: pathname === '/components/scroll-area',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/separator',
    //           label: t('separator'),
    //           active: pathname === '/components/separator',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/sheet',
    //           label: t('sheet'),
    //           active: pathname === '/components/sheet',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/skeleton',
    //           label: t('skeleton'),
    //           active: pathname === '/components/skeleton',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/sonner',
    //           label: t('sonner'),
    //           active: pathname === '/components/sonner',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/tabs',
    //           label: t('tabs'),
    //           active: pathname === '/components/tabs',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/toast',
    //           label: t('toast'),
    //           active: pathname === '/components/toast',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/toggle',
    //           label: t('toggle'),
    //           active: pathname === '/components/toggle',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/tooltip',
    //           label: t('tooltip'),
    //           active: pathname === '/components/tooltip',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/typography',
    //           label: t('typography'),
    //           active: pathname === '/components/typography',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/components/colors',
    //           label: t('colors'),
    //           active: pathname === '/components/colors',
    //           icon: '',
    //           children: [],
    //         },
    //       ],
    //     },
    //   ],
    // },
    // {
    //   groupLabel: '',
    //   id: 'forms',
    //   menus: [
    //     {
    //       id: 'forms',
    //       href: '/forms/input',
    //       label: t('forms'),
    //       active: pathname.includes('/forms'),
    //       icon: 'heroicons-outline:clipboard-list',
    //       submenus: [
    //         {
    //           href: '/forms/input',
    //           label: t('input'),
    //           active: pathname === '/forms/input',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/forms/input-group',
    //           label: t('inputGroup'),
    //           active: pathname === '/forms/input-group',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/forms/input-layout',
    //           label: t('inputLayout'),
    //           active: pathname === '/forms/input-layout',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/forms/input-mask',
    //           label: t('inputMask'),
    //           active: pathname === '/forms/input-mask',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/forms/input-otp',
    //           label: t('inputOtp'),
    //           active: pathname === '/forms/input-otp',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/forms/input-file',
    //           label: t('inputFile'),
    //           active: pathname === '/forms/input-file',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/forms/form-validation',
    //           label: t('formValidation'),
    //           active: pathname === '/forms/form-validation',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/forms/select',
    //           label: t('select'),
    //           active: pathname === '/forms/select',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/forms/react-select',
    //           label: t('reactSelect'),
    //           active: pathname === '/forms/react-select',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/forms/slider',
    //           label: t('slider'),
    //           active: pathname === '/forms/slider',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/forms/switch',
    //           label: t('switch'),
    //           active: pathname === '/forms/switch',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/forms/radio',
    //           label: t('radio'),
    //           active: pathname === '/forms/radio',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/forms/checkbox',
    //           label: t('checkbox'),
    //           active: pathname === '/forms/checkbox',
    //           icon: '',
    //           children: [],
    //         },

    //         {
    //           href: '/forms/combobox',
    //           label: t('combobox'),
    //           active: pathname === '/forms/combobox',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/forms/command',
    //           label: t('command'),
    //           active: pathname === '/forms/command',
    //           icon: '',
    //           children: [],
    //         },
    //       ],
    //     },
    //   ],
    // },
    // {
    //   groupLabel: '',
    //   id: 'table',
    //   menus: [
    //     {
    //       id: 'table',
    //       href: '/table/basic-table',
    //       label: t('table'),
    //       active: pathname.includes('/table'),
    //       icon: 'heroicons:table-cells',
    //       submenus: [
    //         {
    //           href: '/table/basic-table',
    //           label: t('basicTable'),
    //           active: pathname === '/table/basic-table',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/table/react-table',
    //           label: t('reactTable'),
    //           active: pathname === '/table/react-table',
    //           icon: '',
    //           children: [],
    //         },
    //       ],
    //     },
    //   ],
    // },
    // {
    //   groupLabel: '',
    //   id: 'blocks',
    //   menus: [
    //     {
    //       id: 'blocks',
    //       href: '/blocks/basic-widget',
    //       label: t('widget'),
    //       active: pathname.includes('/blocks'),
    //       icon: 'heroicons-outline:view-grid-add',
    //       submenus: [
    //         {
    //           href: '/blocks/basic-widget',
    //           label: t('basicWidget'),
    //           active: pathname === '/blocks/basic-widget',
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/blocks/statistic-widget',
    //           label: t('statisticsWidget'),
    //           active: pathname === '/blocks/statistic-widget',
    //           icon: '',
    //           children: [],
    //         },
    //       ],
    //     },
    //   ],
    // },
    // {
    //   groupLabel: '',
    //   id: 'charts',
    //   menus: [
    //     {
    //       id: 'charts',
    //       href: '/charts/appex-charts/charts-appex-area',
    //       label: t('chart'),
    //       active: pathname.includes('/charts'),
    //       icon: 'heroicons:chart-bar',
    //       submenus: [
    //         {
    //           href: '/charts/appex-charts/charts-appex-area',
    //           label: t('appexCharts'),
    //           active: pathname.includes('/charts/appex-charts'),
    //           icon: 'heroicons:chart-bar',
    //           children: [
    //             {
    //               href: '/charts/appex-charts/charts-appex-area',
    //               label: t('areaCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-area'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/appex-charts/charts-appex-bar',
    //               label: t('barCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-bar'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/appex-charts/charts-appex-boxplot',
    //               label: t('boxplotCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-boxplot'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/appex-charts/charts-appex-bubble',
    //               label: t('bubbleCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-bubble'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/appex-charts/charts-appex-candlestick',
    //               label: t('candlestickCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-candlestick'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/appex-charts/charts-appex-column',
    //               label: t('columnCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-column'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/appex-charts/charts-appex-combo',
    //               label: t('comboCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-combo'
    //               ),
    //               children: [],
    //             },

    //             {
    //               href: '/charts/appex-charts/charts-appex-funnel',
    //               label: t('funnelCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-funnel'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/appex-charts/charts-appex-heatmap',
    //               label: t('heatmapCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-heatmap'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/appex-charts/charts-appex-line',
    //               label: t('lineCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-line'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/appex-charts/charts-appex-pie',
    //               label: t('pieCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-pie'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/appex-charts/charts-appex-polararea',
    //               label: t('ploarareaCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-polararea'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/appex-charts/charts-appex-radar',
    //               label: t('radarCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-radar'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/appex-charts/charts-appex-radialbars',
    //               label: t('radialbarCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-radialbars'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/appex-charts/charts-appex-range',
    //               label: t('rangeCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-range'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/appex-charts/charts-appex-scatter',
    //               label: t('scatterCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-scatter'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/appex-charts/charts-appex-timeline',
    //               label: t('timelineCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-timeline'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/appex-charts/charts-appex-treemap',
    //               label: t('treemapCharts'),
    //               active: pathname.includes(
    //                 '/charts/appex-charts/charts-appex-treemap'
    //               ),
    //               children: [],
    //             },
    //           ],
    //         },
    //         {
    //           href: '/charts/rechart/charts-rechart-area',
    //           label: t('rechart'),
    //           active: pathname.includes('/charts/rechart'),
    //           icon: 'heroicons:chart-bar',
    //           children: [
    //             {
    //               href: '/charts/rechart/charts-rechart-area',
    //               label: t('areaCharts'),
    //               active: pathname.includes(
    //                 '/charts/rechart/charts-rechart-area'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/rechart/charts-rechart-bar',
    //               label: t('barCharts'),
    //               active: pathname.includes(
    //                 '/charts/rechart/charts-rechart-bar'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/rechart/charts-rechart-composed',
    //               label: t('composedCharts'),
    //               active: pathname.includes(
    //                 '/charts/rechart/charts-rechart-composed'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/rechart/charts-rechart-line',
    //               label: t('lineCharts'),
    //               active: pathname.includes(
    //                 '/charts/rechart/charts-rechart-line'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/rechart/charts-rechart-pie',
    //               label: t('pieCharts'),
    //               active: pathname.includes(
    //                 '/charts/rechart/charts-rechart-pie'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/rechart/charts-rechart-radar',
    //               label: t('radarCharts'),
    //               active: pathname.includes(
    //                 '/charts/rechart/charts-rechart-radar'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/rechart/charts-rechart-radialbar',
    //               label: t('radialbarCharts'),
    //               active: pathname.includes(
    //                 '/charts/rechart/charts-rechart-radialbar'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/rechart/charts-rechart-scatter',
    //               label: t('scatterCharts'),
    //               active: pathname.includes(
    //                 '/charts/rechart/charts-rechart-scatter'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/rechart/charts-rechart-treemap',
    //               label: t('treemapCharts'),
    //               active: pathname.includes(
    //                 '/charts/rechart/charts-rechart-treemap'
    //               ),
    //               children: [],
    //             },
    //           ],
    //         },
    //         {
    //           href: '/charts/chart-js/charts-chartjs-area',
    //           label: t('chartJs'),
    //           active: pathname.includes('/charts/chart-js'),
    //           icon: 'heroicons:chart-bar',
    //           children: [
    //             {
    //               href: '/charts/chart-js/charts-chartjs-area',
    //               label: t('areaCharts'),
    //               active: pathname.includes(
    //                 '/charts/chart-js/charts-chartjs-area'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/chart-js/charts-chartjs-bar',
    //               label: t('barCharts'),
    //               active: pathname.includes(
    //                 '/charts/chart-js/charts-chartjs-bar'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/chart-js/charts-chartjs-line',
    //               label: t('lineCharts'),
    //               active: pathname.includes(
    //                 '/charts/chart-js/charts-chartjs-line'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/chart-js/charts-chartjs-animations',
    //               label: t('animationCharts'),
    //               active: pathname.includes(
    //                 '/charts/chart-js/charts-chartjs-animations'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/chart-js/charts-chartjs-legend',
    //               label: t('legendCharts'),
    //               active: pathname.includes(
    //                 '/charts/chart-js/charts-chartjs-legend'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/chart-js/charts-chartjs-scaleoptions',
    //               label: t('scaleOptionCharts'),
    //               active: pathname.includes(
    //                 '/charts/chart-js/charts-chartjs-scaleoptions'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/chart-js/charts-chartjs-scales',
    //               label: t('scaleCharts'),
    //               active: pathname.includes(
    //                 '/charts/chart-js/charts-chartjs-scales'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/chart-js/charts-chartjs-scriptable',
    //               label: t('scriptableCharts'),
    //               active: pathname.includes(
    //                 '/charts/chart-js/charts-chartjs-scriptable'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/chart-js/charts-chartjs-title',
    //               label: t('titleCharts'),
    //               active: pathname.includes(
    //                 '/charts/chart-js/charts-chartjs-title'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/chart-js/charts-chartjs-tooltip',
    //               label: t('tooltipChart'),
    //               active: pathname.includes(
    //                 '/charts/chart-js/charts-chartjs-tooltip'
    //               ),
    //               children: [],
    //             },
    //             {
    //               href: '/charts/chart-js/charts-chartjs-other',
    //               label: t('otherCharts'),
    //               active: pathname.includes(
    //                 '/charts/chart-js/charts-chartjs-other'
    //               ),
    //               children: [],
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //   ],
    // },
    // {
    //   groupLabel: '',
    //   id: 'maps',
    //   menus: [
    //     {
    //       id: 'maps',
    //       href: '/maps/maps-leaflet',
    //       label: t('maps'),
    //       active: pathname.includes('/maps/maps-leaflet'),
    //       icon: 'heroicons-outline:map',
    //       submenus: [
    //         {
    //           href: '/maps/maps-leaflet',
    //           label: t('mapsLeaflet'),
    //           active: pathname.includes('/maps/maps-leaflet'),
    //           icon: '',
    //           children: [],
    //         },
    //         {
    //           href: '/maps/maps-vector',
    //           label: t('mapsVector'),
    //           active: pathname.includes('/maps/maps-vector'),
    //           icon: '',
    //           children: [],
    //         },
    //       ],
    //     },
    //   ],
    // },
    // {
    //   groupLabel: '',
    //   id: 'icons',
    //   menus: [
    //     {
    //       id: 'icons',
    //       href: '/icons',
    //       label: t('icons'),
    //       active: pathname.includes('/icons'),
    //       icon: 'heroicons-outline:emoji-happy',
    //       submenus: [],
    //     },
    //   ],
    // },
  ];
}
