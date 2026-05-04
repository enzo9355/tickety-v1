import React from 'react';
import TaskInput from './TaskInput';
import TaskList from './TaskList';

export default function TaskPanel({ tasks, selectedTask, onTaskAdded, onTaskSelected, onError }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <TaskInput onTaskAdded={onTaskAdded} onError={onError} />
      <TaskList tasks={tasks} selectedTask={selectedTask} onTaskSelected={onTaskSelected} />
    </div>
  );
}
