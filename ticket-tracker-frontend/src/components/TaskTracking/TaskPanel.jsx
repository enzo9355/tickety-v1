import React from 'react';
import TaskInput from './TaskInput';
import TaskList from './TaskList';

export default function TaskPanel({ tasks, selectedTask, onTaskAdded, onTaskSelected, onTaskDeleted, onError, initialUrl }) {
  return (
    <div id="task-input-section" className="flex flex-col gap-lg">
      <TaskInput onTaskAdded={onTaskAdded} onError={onError} initialUrl={initialUrl} />
      <TaskList tasks={tasks} selectedTask={selectedTask} onTaskSelected={onTaskSelected} onTaskDeleted={onTaskDeleted} />
    </div>
  );
}
