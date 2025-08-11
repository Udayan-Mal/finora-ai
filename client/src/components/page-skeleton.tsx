import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/navbar";
import PageLayout from "./page-layout";

export function PageSkeleton({ isError }: { isError?: boolean }) {
  return (
    <div className="min-h-screen pb-10">
      {isError && (
        <div className="text-center text-red-500">Something went wrong</div>
      )}
      <Navbar />
      <PageLayout
        renderPageHeader={
          <div className="space-y-3">
            <Skeleton className="h-8 w-64 bg-white/30" />
            <Skeleton className="h-4 w-96 bg-white/30" />
          </div>
        }
      >
        <div className="h-full w-full space-y-6 p-4 px-0">
          <div className="w-full grid grid-cols-1 lg:grid-cols-6 gap-8">
            <div className="lg:col-span-4">
              <Skeleton className="h-[400px] w-full bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="lg:col-span-2">
              <Skeleton className="h-[400px] w-full bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      </PageLayout>
    </div>
  );
}