import type { Metadata } from "next";
import { Suspense } from "react";
import { RedirectIfSignedIn } from "@/components/forms/RedirectIfSignedIn";
import { RegisterForm } from "@/components/forms/RegisterForm";
import { Panel } from "@/components/pixel/Panel";
import { PixelText } from "@/components/pixel/PixelText";

export const metadata: Metadata = { title: "Tạo tài khoản" };

export default function RegisterPage() {
  const inviteRequired = Boolean(process.env.SIGNUP_INVITE_CODE);
  return (
    <div className="mx-auto flex max-w-[28rem] flex-col items-center gap-6">
      <PixelText lines={["TACTICS", "FOR TRAPS"]} scale={3} />
      <Panel title="Tạo tài khoản" className="w-full">
        <Suspense fallback={null}>
          <RedirectIfSignedIn />
        </Suspense>
        <RegisterForm inviteRequired={inviteRequired} />
      </Panel>
    </div>
  );
}
