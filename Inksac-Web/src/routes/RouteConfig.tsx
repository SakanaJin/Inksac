import { Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "../pages/home/home-page";
import { NotFoundPage } from "../pages/not-found";
import { RoomPage } from "../pages/room-page";
import { routes } from "./RouteIndex";
import { AppLayout } from "../components/layout/app-layout";

export const RouteConfig = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route path={routes.home} element={<HomePage />} />
      <Route path={routes.root} element={<Navigate to={routes.home} />} />
    </Route>
    <Route path={routes.room} element={<RoomPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
