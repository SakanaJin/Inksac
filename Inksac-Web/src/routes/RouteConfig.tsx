import { Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "../pages/home/home-page";
import { NotFoundPage } from "../pages/not-found";
import { routes } from "./RouteIndex";
import { AppLayout } from "../components/layout/app-layout";

export const RouteConfig = () => (
  <Routes>
    <Route
      path={routes.home}
      element={
        <AppLayout>
          <HomePage />
        </AppLayout>
      }
    />
    <Route path={routes.root} element={<Navigate to={routes.home} />} />
    <Route
      path="*"
      element={
        <AppLayout>
          <NotFoundPage />
        </AppLayout>
      }
    />
  </Routes>
);
