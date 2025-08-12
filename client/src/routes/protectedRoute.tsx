import { useTypedSelector } from "@/app/hook";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AUTH_ROUTES, PROTECTED_ROUTES } from "./common/routePath";
import useBillingSubscription from "@/hooks/use-billing-subscription";
import { PageSkeleton } from "@/components/page-skeleton";
//

const BILLING_PAGE = PROTECTED_ROUTES.SETTINGS_BILLING;

const ProtectedRoute = () => {
  const location = useLocation();
  const { accessToken, user } = useTypedSelector((state) => state.auth);
  const { isSuccess, isLoading, isError, isPro, isTrialActive } = useBillingSubscription(accessToken);
  const disableBillingGuard = import.meta.env.VITE_DISABLE_BILLING_GUARD === "true";

  const isSettingsPage =
    location.pathname === PROTECTED_ROUTES.SETTINGS ||
    location.pathname.startsWith(PROTECTED_ROUTES.SETTINGS + "/");

  if (!accessToken && !user) return <Navigate to={AUTH_ROUTES.SIGN_IN} replace />;

  // Always allow Settings pages to render without waiting for billing fetch
  if (isSettingsPage) {
    return <Outlet />;
  }

  if (disableBillingGuard) {
    return <Outlet />;
  }

  if (isLoading || !isSuccess) return <PageSkeleton isError={isError} />;

  // Allow access if user is pro, on an active trial, or on any settings page
  if (isPro || isTrialActive) {
    return <Outlet />;
  }

  // If not pro and not on trial, redirect to billing
  return <Navigate to={BILLING_PAGE} />;
};

export default ProtectedRoute;
