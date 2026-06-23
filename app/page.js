"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState([]);

  // LOAD TASKS
  const fetchTasks = async () => {
    const { data } = await supabase.from("tasks").select("*").order("id");
    setTasks(data || []);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // ADD TASK
  const addTask = async () => {
    if (!task.trim()) return;

    const { data } = await supabase
      .from("tasks")
      .insert([{ text: task, completed: false }])
      .select();

    setTasks([...tasks, data[0]]);
    setTask("");
  };

  // TOGGLE COMPLETE
  const toggleTask = async (id, current) => {
    await supabase
      .from("tasks")
      .update({ completed: !current })
      .eq("id", id);

    setTasks(
      tasks.map((t) =>
        t.id === id ? { ...t, completed: !current } : t
      )
    );
  };

  // DELETE
  const deleteTask = async (id) => {
    await supabase.from("tasks").delete().eq("id", id);

    setTasks(tasks.filter((t) => t.id !== id));
  };

  return (
    <main className="container">
      <h1>My To-Do List</h1>

      <div className="input-row">
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Enter a task..."
        />

        <button onClick={addTask}>Add</button>
      </div>

      <ul>
        {tasks.map((t) => (
          <li key={t.id}>
            <span
              onClick={() => toggleTask(t.id, t.completed)}
              className={t.completed ? "completed" : ""}
            >
              {t.text}
            </span>

            <button onClick={() => deleteTask(t.id)}>
              X
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}