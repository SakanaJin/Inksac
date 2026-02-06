import { Routes, Route } from "react-router-dom";
import { LoginPage } from "../pages/login-page";
import { HomePage } from "../pages/home/home-page";
import { NotFoundPage } from "../pages/not-found";

export const RouteConfig = () => (
  <Routes>
    <Route path="/" element={<LoginPage />} />
    <Route path="/home" element={<HomePage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
