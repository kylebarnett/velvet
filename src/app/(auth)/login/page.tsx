import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = { title: "Log In | PostSig" };

export default function LoginPage() {
  return <AuthCard mode="login" />;
}

