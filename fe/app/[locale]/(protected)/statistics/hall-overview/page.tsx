'use client';
import { Card, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useQuery } from '@tanstack/react-query';
import { statisticsAPI, type HallOverview } from '@/config/axios';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

export default function HallOverviewPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['hall-overview'],
    queryFn: () => statisticsAPI.getHallOverview(),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const halls: HallOverview[] = data?.data?.data ?? [];

  return (
    <>
      <Card className="animate-fade-up">
        <CardContent className="p-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Hall Overview</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </CardContent>
      </Card>

      <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <>
            {Array.from({ length: 3 }).map((_, idx) => (
              <Card key={idx} className="animate-fade-up">
                <CardContent className="p-4 space-y-4">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {!isLoading && isError && (
          <Card className="animate-fade-up">
            <CardContent className="p-4">
              <p className="text-sm text-red-600">Không thể tải dữ liệu.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && halls.length === 0 && (
          <Card className="animate-fade-up">
            <CardContent className="p-4">
              <p className="text-sm">Không có dữ liệu hall.</p>
            </CardContent>
          </Card>
        )}

        {halls.map((hall) => {
          const current = hall.sessions.find(
            (s) => s.sessionId === hall.currentSessionId
          );
          return (
            <Card key={hall.hallId} className="animate-fade-up">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold text-lg">{hall.hallName}</h2>
                  <span className="text-xs text-muted-foreground">
                    Tổng phiên: {hall.totalSessions}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Phiên hiện tại: </span>
                  {hall.currentSessionNumber ?? '—'}
                </div>
                {hall.sessions.map((s) => {
                  const pct = s.totalStudents
                    ? Math.min(
                        100,
                        Math.round((s.checkedInCount / s.totalStudents) * 100)
                      )
                    : 0;
                  const isCur = s.sessionId === hall.currentSessionId;
                  return (
                    <div
                      key={s.sessionId}
                      className={`rounded-md border p-3 ${
                        isCur ? 'border-primary' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">Session {s.sessionNumber}</span>
                          {isCur && (
                            <span className="ml-2 text-xs text-primary">(Hiện tại)</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.checkedInCount}/{s.totalStudents}
                        </div>
                      </div>
                      <div className="mt-2">
                        <Progress value={pct} />
                        <div className="mt-1 text-xs text-muted-foreground">
                          {pct}% đã checkin
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

