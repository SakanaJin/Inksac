import { Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "../pages/home/home-page";
import { NotFoundPage } from "../pages/not-found";
import { routes } from "./RouteIndex";

export const RouteConfig = () => (
  <Routes>
    <Route path={routes.home} element={<HomePage />} />
    <Route path={routes.root} element={<Navigate to={routes.home} />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
