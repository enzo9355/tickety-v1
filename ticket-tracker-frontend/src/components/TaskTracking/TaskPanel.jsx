import React from 'react';
import TaskInput from './TaskInput';
import TaskList from './TaskList';

export default function TaskPanel({ tasks, selectedTask, onTaskAdded, onTaskSelected, onError, initialUrl }) {
  return (
    <div id="task-input-section" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <TaskInput onTaskAdded={onTaskAdded} onError={onError} initialUrl={initialUrl} />
      <TaskList tasks={tasks} selectedTask={selectedTask} onTaskSelected={onTaskSelected} />
    </div>
  );
}
