// ✅ ADMIN LAYOUT - ONLY GUARD FOR ADMIN ROUTES
// This is the ONLY place that should control admin access
// Place this in your frontend: /app/admin/layout.tsx (App Router) or /pages/_layouts/AdminLayout.tsx (Pages Router)

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    setReady(true);
  }, []);

  if (!ready) return <p>Loading...</p>;

  return children;
}