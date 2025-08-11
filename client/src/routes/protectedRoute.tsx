import { useTypedSelector } from "@/app/hook";
import { Navigate, Outlet, useLocation, Link } from "react-router-dom";
import { AUTH_ROUTES, PROTECTED_ROUTES } from "./common/routePath";
import useBillingSubscription from "@/hooks/use-billing-subscription";
import { PageSkeleton } from "@/components/page-skeleton";
import { User } from "lucide-react";

const BILLING_PAGE = PROTECTED_ROUTES.SETTINGS_BILLING;

const ProtectedRoute = () => {
  const location = useLocation();
  const { accessToken, user } = useTypedSelector((state) => state.auth);
  const { isSuccess, isLoading, isError, isPro, isTrialActive } = useBillingSubscription(accessToken);

  const SETTINGS_PAGES = [
    PROTECTED_ROUTES.SETTINGS_APPEARANCE,
  ];

  console.log("Current path:", location.pathname);

  const isSettingsPage =
    location.pathname === PROTECTED_ROUTES.SETTINGS_APPEARANCE ||
    location.pathname.startsWith(PROTECTED_ROUTES.SETTINGS_APPEARANCE + "/");

  if (!accessToken && !user) return <Navigate to={AUTH_ROUTES.SIGN_IN} replace />;

  if (isLoading || !isSuccess) return <PageSkeleton isError={isError} />;

  // Allow access if user is pro, on an active trial, or on any settings page
  if (isPro || isTrialActive || isSettingsPage) {
    return <Outlet />;
  }

  // If not pro and not on trial, redirect to billing
  return <Navigate to={BILLING_PAGE} />;
};

export default ProtectedRoute;
<Link to="/settings/appearance">Appearance</Link>
