import { notifications } from "@mantine/notifications";
import axios, { AxiosError } from "axios";
import type { AxiosResponse } from "axios";
import { EnvVars } from "./env-vars";
import type { FileWithPath } from "@mantine/dropzone";
import type { ApiResponse, ApiError } from "../constants/types";

const baseurl = EnvVars.apiBaseUrl;

const axiosInstance = axios.create({
  baseURL: baseurl,
  withCredentials: true,
});

type ErrorHandler = (response?: AxiosResponse) => Promise<any> | void;

const errorHandlers: Record<number, ErrorHandler> = {
  "400": (response) => {
    response.data.errors.forEach((error: ApiError) => {
      console.error(error);
    });
    return Promise.resolve(response);
  },
  "401": (response) => {
    response?.data.errors.forEach((error: ApiError) => {
      console.error(error);
    });
    return Promise.resolve(response);
  },
  "403": (response) => {
    response?.data.errors.forEach((error: ApiError) => {
      console.error(error);
    });
    notifications.show({
      title: "Error",
      message: "You are not authorized to perform this action",
      color: "red",
    });
    return Promise.reject(response);
  },
  "404": (response) => {
    response?.data.errors.forEach((error: ApiError) => {
      console.error(error);
    });
    return Promise.reject(response);
  },
  "413": (response) => {
    response?.data.errors.forEach((error: ApiError) => {
      console.error(error);
    });
    notifications.show({
      title: "Error",
      message: "File size too large",
      color: "red",
    });
    return Promise.reject(response);
  },
  "500": (response) => {
    response?.data.errors.forEach((error: ApiError) => {
      console.error(error);
    });
    notifications.show({
      title: "Error",
      message: "Internal server Error",
      color: "red",
    });
    return Promise.reject(response);
  },
  "503": (response) => {
    response?.data.errors.forEach((error: ApiError) => {
      console.error(error);
      notifications.show({
        title: "Error",
        message: `${error.message}`,
        color: "red",
      });
    });
    return Promise.reject(response);
  },
  "409": (response) => {
    response?.data.errors.forEach((error: ApiError) => {
      console.error(error);
      notifications.show({
        title: "Error",
        message: `${error.message}`,
        color: "red",
      });
    });
    return Promise.reject(response);
  },
};

export async function handleResponseError(error: AxiosError) {
  if (error.response) {
    const response: AxiosResponse = error.response;
    const handler = errorHandlers[response.status];
    if (handler) {
      const result = await handler(error.response);
      if (result) {
        return result;
      }
    }
  }
}

axiosInstance.interceptors.response.use((x: any) => x, handleResponseError);

function post<T>(route: string, data: any) {
  var url = baseurl + route;
  return axiosInstance.post<ApiResponse<T>>(url, data, {
    withCredentials: true,
  });
}

function get<T>(route: string) {
  var url = baseurl + route;
  return axiosInstance.get<ApiResponse<T>>(url, { withCredentials: true });
}

function put<T>(route: string, data: any) {
  var url = baseurl + route;
  return axiosInstance.put<ApiResponse<T>>(url, data, {
    withCredentials: true,
  });
}

function patch<T>(route: string, data: any) {
  var url = baseurl + route;
  return axiosInstance.patch<ApiResponse<T>>(url, data, {
    withCredentials: true,
  });
}

function patchf<T>(route: string, file: FileWithPath) {
  var url = baseurl + route;
  const formData = new FormData();
  formData.append("file", file);
  return axiosInstance.patch<ApiResponse<T>>(url, formData, {
    withCredentials: true,
  });
}

function remove<T>(route: string) {
  var url = baseurl + route;
  return axiosInstance.delete<ApiResponse<T>>(url, { withCredentials: true });
}

type Api = {
  post<T>(route: string, data?: any): Promise<AxiosResponse<ApiResponse<T>>>;
  get<T>(route: string): Promise<AxiosResponse<ApiResponse<T>>>;
  put<T>(route: string, data: any): Promise<AxiosResponse<ApiResponse<T>>>;
  patch<T>(route: string, data: any): Promise<AxiosResponse<ApiResponse<T>>>;
  patchf<T>(
    route: string,
    file: FileWithPath,
  ): Promise<AxiosResponse<ApiResponse<T>>>;
  delete<T>(route: string): Promise<AxiosResponse<ApiResponse<T>>>;
};

const api = {} as Api;

api.post = post;
api.get = get;
api.put = put;
api.patch = patch;
api.patchf = patchf;
api.delete = remove;

export default api;
