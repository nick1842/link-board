"use client";

import { useState } from "react";

export default function Home() {
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState([]);

  const addTask = () => {
  if (task.trim() === "") return;

  setTasks([
    ...tasks,
    {
      id: Date.now(),
      text: task,
      completed: false, // <-- ADD THIS
    },
  ]);

  setTask("");
};

  return (
    <main className="container">
      <h1>My To-Do List</h1>

      <div className="input-row">
        <input
          type="text"
          placeholder="Enter a task..."
          value={task}
          onChange={(e) => setTask(e.target.value)}
        />

        <button onClick={addTask}>Add</button>
      </div>

      <ul>
  {tasks.map((t) => (
    <li key={t.id}>
      <span
        onClick={() => {
          setTasks((prev) =>
            prev.map((task) =>
              task.id === t.id
                ? { ...task, completed: !task.completed }
                : task
            )
          );
        }}
        className={t.completed ? "completed" : ""}
      >
        {t.text}
      </span>

      <button
        onClick={() => {
          setTasks((prev) =>
            prev.filter((task) => task.id !== t.id)
          );
        }}
      >
        X
      </button>
    </li>
  ))}
</ul>
    </main>
  );
}