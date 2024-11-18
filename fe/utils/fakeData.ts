import { get } from 'http';

export type TaskData = {
  totalTasks: number;
  tasksCancelled: number;
  tasksCompleted: number;
  tasksPending: number;
  changeTasksCancelled: number;
  changeTasksCompleted: number;
  changeTasksPending: number;
  changeTotalTasks: number;
};

// Hàm để tạo một số ngẫu nhiên trong khoảng [min, max]
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateTaskData(): TaskData {
  // Giá trị ban đầu của từng loại task
  const tasksCancelled = getRandomInt(40, 60);
  const tasksCompleted = getRandomInt(150, 200);
  const tasksPending = getRandomInt(10, 20);

  // Tạo thay đổi ngẫu nhiên cho từng loại task trong khoảng từ 0 tới nửa giá trị hiện tại
  const changeTasksCancelled =
    getRandomInt(0, Math.floor(tasksCancelled / 2)) *
    (Math.random() < 0.5 ? -1 : 1);
  const changeTasksCompleted =
    getRandomInt(0, Math.floor(tasksCompleted / 2)) *
    (Math.random() < 0.5 ? -1 : 1);
  const changeTasksPending =
    getRandomInt(0, Math.floor(tasksPending / 2)) *
    (Math.random() < 0.5 ? -1 : 1);

  // Tính tổng số task
  const totalTasks = tasksCancelled + tasksCompleted + tasksPending;

  const changeTotalTasks =
    getRandomInt(0, Math.floor(totalTasks / 2)) *
    (Math.random() < 0.5 ? -1 : 1);

  return {
    totalTasks,
    tasksCancelled,
    tasksCompleted,
    tasksPending,
    changeTasksCancelled,
    changeTasksCompleted,
    changeTasksPending,
    changeTotalTasks,
  };
}
