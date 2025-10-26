import { Bachelor } from '@/dtos/BachelorDTO';
import axios from 'axios';

// const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL
//   ? `${process.env.NEXT_PUBLIC_SITE_URL}/api`
//   : 'http://localhost:85/api';

const BASE_URL = 'http://143.198.84.82:85/api';
const axiosInstance = axios.create({
  baseURL: BASE_URL,
});

axiosInstance.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken');

  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
    config.timeout = 30000;
  }

  return config;
});

export type User = {
  userName: string | undefined;
  password: string | undefined;
};

export const loginAPI = {
  login: async (user: User) => {
    return await axios.post(BASE_URL + '/Auth/Login', user);
  },
};

export const ledAPI = {
  getHallList: async () => {
    return await axiosInstance.get('/Hall/GetAll');
  },
  getSessionList: async () => {
    return await axiosInstance.get('/Session/GetAll');
  },
  getBachelor1st: async (hall: string, session: string) => {
    return await axiosInstance.get(
      `/Mc/GetBachelor1st?hall=${hall}&session=${session}`
    );
  },
  getBachelorNext: async (hall: string, session: string) => {
    return await axiosInstance.get(
      `/Mc/GetBachelorNext?hall=${hall}&session=${session}`
    );
  },
  getBachelorCurrent: async (hall: string, session: string) => {
    return await axiosInstance.get(
      `/Mc/GetBachelorCurrent?hall=${hall}&session=${session}`
    );
  },
  getBachelorBack: async (hall: string, session: string) => {
    return await axiosInstance.get(
      `/Mc/GetBachelorBack?hall=${hall}&session=${session}`
    );
  },
};

export const testing = {
  connect: async () => {
    return await axios.get(BASE_URL + '/Test/Connect');
  },
};

type Pagination = {
  pageIndex: number;
  pageSize: number;
  search?: string;
  hall?: string;
  session?: string;
};

export const checkinAPI = {
  getBachelorList: async (data: Pagination) => {
    const params = new URLSearchParams({
      pageIndex: data.pageIndex.toString(),
      pageSize: data.pageSize.toString(),
    });
    console.log('data', data);

    // Thêm các tham số tuỳ chọn nếu tồn tại
    if (data.search) params.append('keySearch', data.search);
    if (data.hall) params.append('hallId', data.hall);
    if (data.session) params.append('sessionId', data.session);

    return await axiosInstance.get('/Bachelor/GetAll?' + params.toString());
  },
  checkin: async (data: any) => {
    return await axiosInstance.put('/Checkin/UpdateCheckin', data);
  },
  getLocation: async (data: any) => {
    console.log(BASE_URL + '/Checkin/GetLocation');
    return await axiosInstance.get(
      `/Bachelor/search?keySearch=${data}&pageIndex=1&pageSize=1000`
    );
  },
  UpdateBachelorToTempSession: async (mssv: string, isMorning: boolean) => {
    return await axiosInstance.put(
      `/Bachelor/UpdateBachelorToTempSession/${mssv}`,
      { isMorning: isMorning }
    );
  },
};

export const manageAPI = {
  getBachelorList: async () => {
    return await axiosInstance.get('/Bachelor/GetAll');
  },
  addBachelor: async (data: Bachelor[]) => {
    return await axiosInstance.post('/Bachelor/Add', data);
  },
  deleteBachelor: async (studentCode: string) => {
    return await axiosInstance.delete(`/Bachelor/Delete/${studentCode}`);
  },
  updateBachelor: async (data: Bachelor) => {
    return await axiosInstance.put('/Bachelor/Update', data);
  },
  uploadImage: async (data: FormData) => {
    return await axios.post('http://fjourney.site:3214/upload', data);
  },
  getCheckinList: async () => {
    return await axiosInstance.get('/Checkin/GetAllStatusCheckin');
  },
  updateStatusCheckin: async (data: any) => {
    return await axiosInstance.put('/Checkin/UpdateStatusCheckin', data);
  },
  uncheckAll: async () => {
    return await axiosInstance.put('/Checkin/UncheckAll');
  },
  deleteAllBachelor: async () => {
    return await axiosInstance.delete('/Bachelor/DeleteAll');
  },
  resetDatabase: async () => {
    return await axiosInstance.post('/Database/reset-database');
  },
};

// Statistics APIs
export type HallOverview = {
  hallId: number;
  hallName: string;
  totalSessions: number;
  sessions: Array<{
    sessionId: number;
    sessionNumber: number;
    totalStudents: number;
    checkedInCount: number;
  }>;
  currentSessionId: number | null;
  currentSessionNumber: number | null;
};

export const statisticsAPI = {
  getHallOverview: async () => {
    return await axiosInstance.get<{
      status: number;
      message: string;
      data: HallOverview[];
    }>('/Statistics/hall-overview');
  },
};

// Notification API types (matching backend DTOs)
export type CreateNotificationRequest = {
  title: string;
  content: string;
  priority: number; // 1=High, 2=Medium, 3=Low
  hallId?: number;
  sessionId?: number;
  scheduledAt?: string; // ISO date string
  isAutomatic?: boolean;
  repeatCount?: number;
};

export type NotificationResponse = {
  notificationId: number;
  title: string;
  content: string;
  priority: number;
  priorityText: string; // "High", "Medium", "Low"
  hallId?: number;
  hallName?: string;
  sessionId?: number;
  sessionNumber?: number;
  createdBy: string;
  createdByName: string;
  broadcastBy?: string;
  broadcastByName?: string;
  createdAt: string; // ISO date string
  scheduledAt?: string;
  broadcastAt?: string;
  status: string;
  isAutomatic: boolean;
  repeatCount: number;
  scope: string;
};

export type NotificationListResponse = {
  notifications: NotificationResponse[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
};

export type CreateNotificationResponse = {
  message: string;
  notificationId: number;
};

// Notification APIs (matching backend controller routes)
export const notificationAPI = {
  getAll: async (
    pageIndex: number = 1,
    pageSize: number = 50,
    status?: string
  ) => {
    const params = new URLSearchParams({
      pageIndex: pageIndex.toString(),
      pageSize: pageSize.toString(),
    });
    if (status) params.append('status', status);

    return await axiosInstance.get<NotificationListResponse>(
      `/Notification?${params.toString()}`
    );
  },

  getById: async (id: number) => {
    return await axiosInstance.get<NotificationResponse>(`/Notification/${id}`);
  },

  create: async (data: CreateNotificationRequest) => {
    return await axiosInstance.post<CreateNotificationResponse>(
      '/Notification',
      data
    );
  },

  update: async (id: number, data: CreateNotificationRequest) => {
    return await axiosInstance.put<{ message: string }>(
      `/Notification/${id}`,
      data
    );
  },

  delete: async (id: number) => {
    return await axiosInstance.delete<{ message: string }>(
      `/Notification/${id}`
    );
  },

  getPending: async (hallId?: number, sessionId?: number) => {
    const params = new URLSearchParams();
    if (hallId) params.append('hallId', hallId.toString());
    if (sessionId) params.append('sessionId', sessionId.toString());

    return await axiosInstance.get<NotificationResponse[]>(
      `/Notification/pending?${params.toString()}`
    );
  },

  startBroadcast: async (id: number) => {
<<<<<<< HEAD
    return await axiosInstance.post<{ message: string }>(
      `/Notification/${id}/broadcast`
    );
=======
    return await axiosInstance.post<{ message: string }>(`/Notification/${id}/start-broadcast`);
  },

  broadcast: async (id: number) => {
    return await axiosInstance.post<{ message: string; data: any }>(`/Notification/${id}/broadcast`);
>>>>>>> origin/fea/add_notification
  },

  completeBroadcast: async (id: number) => {
    return await axiosInstance.post<{ message: string }>(
      `/Notification/${id}/complete`
    );
  },

  cancelNotification: async (id: number) => {
    return await axiosInstance.post<{ message: string }>(
      `/Notification/${id}/cancel`
    );
  },
};
