"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, isInitialized } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const role = String(user.role).toUpperCase();
    if (role === "STUDENT") {
      router.replace("/dashboard/student");
    } else if (role === "TEACHER") {
      router.replace("/dashboard/teacher");
    } else if (role === "ADMIN") {
      router.replace("/dashboard/admin");
    } else {
      router.replace("/login");
    }
  }, [user, isInitialized, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="text-gray-500 font-medium">Đang chuyển hướng...</p>
      </div>
    </div>
  );
}
