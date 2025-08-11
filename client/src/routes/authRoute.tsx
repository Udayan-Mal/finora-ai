import { useTypedSelector } from "@/app/hook";
import { Navigate, Outlet } from "react-router-dom";
import { PROTECTED_ROUTES } from "./common/routePath";

const AuthRoute = () => {
  const { accessToken, user } = useTypedSelector((state) => state.auth);

  if (!accessToken && !user) return <Outlet />;

  return <Navigate to={PROTECTED_ROUTES.OVERVIEW} replace />;
};

export default AuthRoute;
