import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/forms/LoginForm";
import { RedirectIfSignedIn } from "@/components/forms/RedirectIfSignedIn";
import { Panel } from "@/components/pixel/Panel";
import { PixelText } from "@/components/pixel/PixelText";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-[28rem] flex-col items-center gap-6">
      <PixelText lines={["TACTICS", "FOR TRAPS"]} scale={3} />
      <Panel title="Đăng nhập" className="w-full">
        <Suspense fallback={null}>
          <RedirectIfSignedIn />
        </Suspense>
        <Suspense fallback={<div className="h-72" aria-hidden />}>
          <LoginForm />
        </Suspense>
      </Panel>
    </div>
  );
}
