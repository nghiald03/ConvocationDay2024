'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CreateTodo from './create-todo';
import { todos } from './data';
import { ScrollArea } from '@/components/ui/scroll-area';
import TodoHeader from './todo-header';
import Todo from './todo';
import TodoSidebarWrapper from './sidebar-wrapper';
import Nav from '@/components/nav';
import { useTranslations } from 'next-intl';
import ProgressBlock from '@/components/blocks/progress-block';
import DashboardDropdown from '@/components/dashboard-dropdown';
import DealsDistributionChart from '@/components/project/deals-distribution-chart';
import { Icon } from '@/components/ui/icon';
import { BarChart, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { generateTaskData } from '@/utils/fakeData';
import { cn } from '@/lib/utils';
import TasksPage from './taskPage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskTemplate from './tasks-template/page';
import CalenderPage from './calenderTasks/page';

const Page = () => {
  const t = useTranslations('TodoApp');

  return (
    <>
      <Card>
        <CardHeader>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Quản lí</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Công việc nông trại</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </CardHeader>
        <CardContent className='pt-3'>
          <Tabs defaultValue='tasksTemplate' className='w-full'>
            <TabsList>
              <TabsTrigger
                value='tasksTemplate'
                className='relative before:absolute before:top-full before:left-0 before:h-px before:w-full data-[state=active]:before:bg-primary'
              >
                <Icon icon='carbon:task-star' className='h-4 w-4 me-1' />
                Công việc mẫu
              </TabsTrigger>
              <TabsTrigger
                value='tasks'
                className='relative before:absolute before:top-full before:left-0 before:h-px before:w-full data-[state=active]:before:bg-primary'
              >
                <Icon
                  icon='fluent:task-list-ltr-20-filled'
                  className='h-4 w-4 me-1'
                />
                Công việc
              </TabsTrigger>
              <TabsTrigger
                value='daylyTasks'
                className='relative before:absolute before:top-full before:left-0 before:h-px before:w-full data-[state=active]:before:bg-primary'
              >
                <Icon icon='hugeicons:task-daily-02' className='h-4 w-4 me-1' />
                Công việc thường ngày
              </TabsTrigger>
              <TabsTrigger
                value='calendarTasks'
                className='relative before:absolute before:top-full before:left-0 before:h-px before:w-full data-[state=active]:before:bg-primary'
              >
                <Icon icon='uil:calender' className='h-4 w-4 me-1' />
                Lịch công việc
              </TabsTrigger>
            </TabsList>
            <TabsContent value='tasksTemplate'>
              <TaskTemplate />
            </TabsContent>
            <TabsContent value='tasks'>
              <TasksPage />
            </TabsContent>
            <TabsContent value='daylyTasks'>
              Aliqua id fugiat nostrud irure ex duis ea quis id quis ad et. Sunt
              qui
            </TabsContent>
            <TabsContent value='calendarTasks'>
              <CalenderPage></CalenderPage>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
};

export default Page;
