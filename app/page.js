"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState([]);
  const [dueDate, setDueDate] = useState("");

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

  const { data, error } = await supabase
    .from("tasks")
    .insert([
      {
        text: task,
        completed: false,
        due_date: dueDate || null,
      },
    ])
    .select();

  if (error) {
    console.log(error);
    return;
  }

  setTasks([...tasks, data[0]]);
  setTask("");
  setDueDate("");
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

  <input
    type="date"
    value={dueDate}
    onChange={(e) => setDueDate(e.target.value)}
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

  {t.due_date && (
    <small style={{ marginLeft: "10px", opacity: 0.6 }}>
      due: {t.due_date}
    </small>
  )}

  <button onClick={() => deleteTask(t.id)}>X</button>
</li>
        ))}
      </ul>
    </main>
  );
}