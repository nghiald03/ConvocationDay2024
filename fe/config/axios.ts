import { Bachelor } from '@/dtos/BachelorDTO';
import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api`
  : 'http://fjourney.site:85/api';
console.log(BASE_URL);

const axiosInstance = axios.create({
  baseURL: 'http://fjourney.site:85' + '/api',
});

axiosInstance.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken');

  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
    config.timeout = 10000;
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

export const checkinAPI = {
  getBachelorList: async () => {
    return await axiosInstance.get(
      '/Bachelor/GetAll?pageIndex=1&pageSize=2000'
    );
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
};

export const manageAPI = {
  getBachelorList: async () => {
    return await axiosInstance.get('/Bachelor/GetAll');
  },
  addBachelor: async (data: Bachelor[]) => {
    return await axiosInstance.post('/Bachelor/Add', data);
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
};
