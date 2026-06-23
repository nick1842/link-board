"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // LOAD TASKS
  // -----------------------------
  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load tasks");
      return;
    }

    setTasks(data);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // -----------------------------
  // ADD TASK
  // -----------------------------
  const addTask = async (e) => {
    e.preventDefault();

    if (!task.trim()) {
      toast.error("Task cannot be empty");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("tasks").insert([
      {
        title: task,
      },
    ]);

    setLoading(false);

    if (error) {
      toast.error("Failed to add task");
      return;
    }

    setTask("");
    toast.success("Task added!");
  };

  // -----------------------------
  // DELETE TASK
  // -----------------------------
  const deleteTask = async (id) => {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete task");
      return;
    }

    toast("Task deleted", { icon: "🗑️" });
  };

  // -----------------------------
  // REAL-TIME NOTIFICATIONS
  // -----------------------------
  useEffect(() => {
    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tasks" },
        (payload) => {
          setTasks((prev) => [payload.new, ...prev]);
          toast.success(`New task: ${payload.new.title}`);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tasks" },
        (payload) => {
          setTasks((prev) =>
            prev.filter((t) => t.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div style={{ padding: "20px" }}>
      <h1>My Tasks</h1>

      {/* ADD TASK FORM */}
      <form onSubmit={addTask} style={{ marginBottom: "20px" }}>
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Enter a task"
          style={{ padding: "8px", marginRight: "10px" }}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add"}
        </button>
      </form>

      {/* TASK LIST */}
      <ul>
        {tasks.map((t) => (
          <li
            key={t.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <span>{t.title}</span>

            <button onClick={() => deleteTask(t.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}