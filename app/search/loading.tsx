import { DestinationCardSkeleton } from "@/components/DestinationCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="py-4">
        <Skeleton className="h-24 w-full rounded-3xl" />
      </div>
      <div className="grid gap-8 pt-4 lg:grid-cols-[300px_1fr] lg:gap-10">
        <aside className="hidden lg:grid lg:gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-2xl" />
          ))}
        </aside>
        <div>
          <Skeleton className="h-9 w-72 rounded-full" />
          <Skeleton className="mt-3 h-4 w-96 rounded-full" />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <DestinationCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
