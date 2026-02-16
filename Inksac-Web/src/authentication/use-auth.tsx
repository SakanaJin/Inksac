import { createContext, useContext, useState } from "react";
import { useAsyncRetry, useAsyncFn } from "react-use";
import type { ApiError, UserGetDto } from "../constants/types";
import { LoginPage } from "../pages/login-page";
import { Loader } from "@mantine/core";
import api from "../config/axios";
import type { FileWithPath } from "@mantine/dropzone";
import { notifications } from "@mantine/notifications";

interface AuthState {
  user: UserGetDto | null;
  errors: ApiError[];
  fetchCurrentUser: () => void;
  logout: () => void;
  updatePfp: (file: FileWithPath) => boolean;
  defaultPfp: () => boolean;
}

const INITIALSTATE: AuthState = {
  user: null,
  errors: [],
  fetchCurrentUser: undefined as any,
  logout: undefined as any,
  updatePfp: undefined as any,
  defaultPfp: undefined as any,
};

export const AuthContext = createContext<AuthState>(INITIALSTATE);

export const AuthProvider = (props: any) => {
  const [errors, setErrors] = useState<ApiError[]>(INITIALSTATE.errors);
  const [user, setUser] = useState<UserGetDto | null>(INITIALSTATE.user);

  const fetchCurrentUserAsync = useAsyncRetry(async () => {
    setErrors([]);
    const response = await api.get<UserGetDto>(`/auth/get-current-user`);

    if (response.data.has_errors) {
      response.data.errors.forEach((err) => {
        console.error(err.message);
      });
      setErrors(response.data.errors);
      return response.data;
    }
    if (response.data.data) {
      setUser(response.data.data);
    }
  }, []);

  const [, logoutUser] = useAsyncFn(async () => {
    setErrors([]);
    const response = await api.post<boolean>(`/auth/logout`);

    if (response.status !== 200) {
      console.log(`Error on logout: ${response.statusText}`);
      return response;
    }

    if (response.status === 200) {
      setUser(null);
    }
    return response;
  }, []);

  const updatePfp = async (file: FileWithPath) => {
    const response = await api.patchf<UserGetDto>(`/users/pfp`, file);

    if (response.data.has_errors) {
      notifications.show({
        title: "Error",
        message: "Error updating pfp",
        color: "red",
      });
      return false;
    }

    if (response.data.data) {
      setUser(response.data.data);
      return true;
    }
    return false;
  };

  const defaultPfp = async () => {
    const response = await api.delete<UserGetDto>(`/users/pfp`);

    if (response.data.has_errors) {
      notifications.show({
        title: "Error",
        message: "Error updating pfp",
        color: "red",
      });
      return false;
    }

    if (response.data.data) {
      setUser(response.data.data);
      return true;
    }
    return false;
  };

  if (fetchCurrentUserAsync.loading) {
    return <Loader />;
  }

  if (!user && !fetchCurrentUserAsync.loading) {
    return <LoginPage fetchCurrentUser={fetchCurrentUserAsync.retry} />;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        errors,
        fetchCurrentUser: fetchCurrentUserAsync.retry, // rename here
        logout: logoutUser,
        updatePfp: updatePfp,
        defaultPfp: defaultPfp,
      }}
      {...props}
    />
  );
};

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export function useUser(): UserGetDto {
  const { user } = useContext(AuthContext);
  if (!user) {
    throw new Error(`useUser must be used within an authenticated app`);
  }
  return user;
}
