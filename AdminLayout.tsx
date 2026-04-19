// ✅ ADMIN LAYOUT - ONLY GUARD FOR ADMIN ROUTES
// This is the ONLY place that should control admin access
// Place this in your frontend: /app/admin/layout.tsx (App Router) or /pages/_layouts/AdminLayout.tsx (Pages Router)

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push("/login");
  }, [user, loading]);

  if (loading) return <p>Loading...</p>;

  if (!user) {
    router.push("/login");
    return null;
  }

  if (user.role.toLowerCase() !== "admin") {
    router.push("/unauthorized");
    return null;
  }

  return children;
}