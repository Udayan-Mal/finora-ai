import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PLAN_TYPE, PLANS } from "@/constant/plan.constant";
import { cn } from "@/lib/utils";
import { CheckCircle, Loader } from "lucide-react";
import { Button as DayPickerButton } from "react-day-picker";
import { Switch } from "@radix-ui/react-switch";

interface SelectedPlan {
  price: string;
  billing: string;
  savings: string | null;
  features: string[];
}

interface PlanCardProps {
  selectedPlan: SelectedPlan | undefined;
  isYearly: boolean;
  onPlanChange: (isYearly: boolean) => void;
  isPro: boolean;
  isLoading: boolean;
  className?: string;
  currentPlanType?: PLAN_TYPE;
  onSubscriptionAction: () => void;
}

const BillingPlanCard = ({
  selectedPlan,
  isYearly,
  onPlanChange,
  isPro,
  isLoading,
  className,
  currentPlanType,
  onSubscriptionAction,
}: PlanCardProps) => {
  if (!selectedPlan) return null;
  const isCurrentPlan = currentPlanType === (isYearly ? PLANS.YEARLY : PLANS.MONTHLY);
  const buttonVariant = isPro && isCurrentPlan ? "outline" : "default";
  const buttonText = !isPro
    ? "Upgrade to Pro"
    : isCurrentPlan
      ? "Manage Subscription"
      : `Switch to ${isYearly ? "Yearly" : "Monthly"}`;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Pro Plan</CardTitle>
        <div className="flex items-center justify-between">
          <div className="text-4xl font-bold">
            ${selectedPlan.price}
            <span className="text-sm font-normal text-muted-foreground">
              /{selectedPlan.billing}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Monthly</span>
            <Switch
              checked={isYearly}
              onCheckedChange={onPlanChange}
              aria-label="Toggle Pro Plans"
            />
            <span className="text-sm">Yearly</span>
            {selectedPlan.savings && (
              <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-green-800">
                {selectedPlan.savings}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3">
          {selectedPlan?.features?.map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          variant={buttonVariant}
          className={cn(
            "w-full",
            {
              "border-[var(--secondary-dark-color)] text-secondary-dark-color dark:text-white":
                isPro && isCurrentPlan,
              "bg-primary text-primary-foreground": !isPro || !isCurrentPlan,
            }
          )}
          size="lg"
          onClick={onSubscriptionAction}
          disabled={isLoading}
        >
          {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          {buttonText}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BillingPlanCard;