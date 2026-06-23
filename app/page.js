"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState([]);
  const [dueDateTime, setDueDateTime] = useState("");
  const [showNotifButton, setShowNotifButton] = useState(true);

  // LOAD TASKS
  const fetchTasks = async () => {
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .order("id");

  const loadedTasks = data || [];
  setTasks(loadedTasks);

  checkDueTasks(loadedTasks);
};

useEffect(() => {
  const interval = setInterval(() => {
    if (tasks.length > 0) {
      checkDueTasks(tasks);
    }
  }, 30000); // every 30 seconds

  return () => clearInterval(interval);
}, [tasks]);

useEffect(() => {
  if (tasks.length > 0) {
    checkDueTasks(tasks);
  }
}, [tasks]);

  

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
        due_datetime: dueDateTime || null,
      },
    ])
    .select();

  if (error) {
    console.log(error);
    return;
  }

  setTasks([...tasks, data[0]]);
  setTask("");
  setDueDateTime("");
};

const checkDueTasks = async (tasks) => {
  const now = new Date();

  for (const t of tasks) {
    if (!t.due_datetime || t.completed || t.notified) continue;

    const dueTime = new Date(t.due_datetime);

    if (dueTime <= now) {
      if (Notification.permission === "granted") {
        new Notification("Lock in 🔒", {
          body: t.text,
        });
      }

      // mark as notified
      const { error } = await supabase
        .from("tasks")
        .update({ notified: true })
        .eq("id", t.id);

      if (error) {
        console.log("Notify update error:", error);
      }
    }
  }
};

const enableNotifications = async () => {
  if (!("Notification" in window)) {
    alert("Not supported");
    setShowNotifButton(false);
    return;
  }

  const permission = await Notification.requestPermission();

  setShowNotifButton(false);

  if (permission === "granted") {
    alert("Notifications enabled!");
  } else {
    alert("Notifications blocked");
  }
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
    type="datetime-local"
    value={dueDateTime}
    onChange={(e) => setDueDateTime(e.target.value)}
  />

  <button onClick={addTask}>Add</button>
  {showNotifButton && (
  <button onClick={enableNotifications}>
    Enable Notifications
  </button>
)}

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

  {t.due_datetime && (
    <small style={{ marginLeft: "10px", opacity: 0.6 }}>
      due: {new Date(t.due_datetime).toLocaleString()}
    </small>
  )}

  <button onClick={() => deleteTask(t.id)}>X</button>
</li>
        ))}
      </ul>
    </main>
  );
}