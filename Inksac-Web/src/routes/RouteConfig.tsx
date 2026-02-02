import { Route, Routes as Switch } from "react-router-dom";
import { NotFoundPage } from "../pages/not-found";

export const Routes = () => {
  return (
    <>
      <Switch>
        <Route path="*" element={<NotFoundPage />} />
      </Switch>
    </>
  );
};
