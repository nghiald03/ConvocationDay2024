'use client';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { AvatarFallback } from '@radix-ui/react-avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { Todo as TodoProps } from '../data';
import { Button } from '@/components/ui/button';
import { SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import DeleteConfirmationDialog from '@/components/delete-confirmation-dialog';
import EditTodo from '../edit-todo';

const TaskTemplates = ({ todo }: { todo: TodoProps }) => {
  const { image, title, isfav, category, priority, status } = todo;

  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [openEdit, setOpenEdit] = useState<boolean>(false);

  const categoryClasses: Record<string, string> = {
    team: 'bg-destructive/10 text-destructive',
    high: 'bg-primary/10 text-primary',
    medium: 'bg-warning/10 text-warning',
    low: 'bg-success/10 text-success',
    update: 'bg-info/10 text-info',
  };

  const statusClasses: Record<string, string> = {
    Initialized: 'bg-muted text-muted-foreground border border-muted',
    'In Progress': 'bg-primary/10 text-primary ',
    'Done by Staff': 'bg-success text-success-foreground border border-success',
    'Verified Done by Admin':
      'bg-primary text-primary-foreground border border-primary',
    'Verification Failed by Admin':
      'bg-destructive text-destructive-foreground border border-destructive',
  };

  const priorityClasses: Record<string, string> = {
    Low: 'bg-secondary text-secondary-foreground border border-secondary',
    Medium: 'bg-warning text-warning-foreground border border-warning',
    High: ' border border-accent',
    Critical:
      'bg-destructive text-destructive-foreground border border-destructive',
  };

  return (
    <>
      <DeleteConfirmationDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
      />
      <EditTodo open={openEdit} setOpen={setOpenEdit} />
      <div
        className={cn(
          'flex items-center gap-4 border-b border-defualt-200 dark:border-default-300 last:border-none px-6 py-4 transition-all duration-300 hover:-translate-y-1'
        )}
      >
        <div>
          <Checkbox className='mt-0.5 dark:bg-default-300' />
        </div>
        <div className='ms-1'>
          {isfav ? (
            <Icon
              icon='heroicons:star-20-solid'
              className='text-xl  cursor-pointer text-[#FFCE30]'
            />
          ) : (
            <Icon
              icon='heroicons:star'
              className='text-xl cursor-pointer text-default-400'
            />
          )}
        </div>
        <div className='flex'>
          <Badge
            className={cn(
              'rounded-sm px-3 py-1 font-medium ',
              priorityClasses[priority]
            )}
          >
            {priority}
          </Badge>
        </div>
        <div className='flex'>
          <Badge
            className={cn(
              'rounded-sm px-3 py-1 font-medium ',
              priorityClasses[priority]
            )}
          >
            Thường ngày
          </Badge>
        </div>
        <p className='flex overflow-hidden text-sm text-default-600 truncate flex-1'>
          {title}
        </p>

        <div className='flex gap-1 items-center'>
          {category.map((item, index) => (
            <Badge
              key={`category-${index}`}
              className={cn(
                'rounded-full px-3 py-1 font-medium',
                categoryClasses[item.value]
              )}
            >
              {item.label}
            </Badge>
          ))}
        </div>
        <Button
          className='bg-transparent text-default-400 ring-offset-transparent hover:bg-transparent hover:ring-0 hover:ring-transparent w-fit'
          size='icon'
          onClick={() => setOpenEdit(true)}
        >
          <SquarePen className=' w-4 h-4' />
        </Button>
        <Button
          className='bg-transparent text-default-400 ring-offset-transparent  hover:text-destructive border-none focus-visible:ring-transparent hover:bg-transparent hover:ring-0 hover:ring-transparent px-0 w-fit'
          size='icon'
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className=' w-4 h-4' />
        </Button>
      </div>
    </>
  );
};

export default TaskTemplates;
