type VITE_ENVIRONMENT = "local" | "development" | "production";

export interface Env {
  isProductionBuild: boolean;
  publicUrl: string;
  name: VITE_ENVIRONMENT;
  buildNumber: string;
  apiBaseUrl?: string;
  host: string;
  subdirectory?: string;
  appRoot: string;
}

const subdirectory = import.meta.env.VITE_SUBDIRECTORY;
const host = `${window.location.protocol}//${window.location.host}`;
const appRoot = `${host}${subdirectory}`;

export const EnvVars: Env = {
  isProductionBuild: import.meta.env.NODE_ENV === "production",
  publicUrl: import.meta.env.PUBLIC_URL,
  name: import.meta.env.VITE_ENVIRONMENT as VITE_ENVIRONMENT,
  buildNumber: import.meta.env.VITE_BUILD_NUMBER || "local",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  host,
  subdirectory,
  appRoot,
};
