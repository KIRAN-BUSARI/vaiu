"use client";

import { PropsWithChildren } from "react";
import { Navbar } from "@/components/mainNavbar";

const AuthLayout = ({ children }: PropsWithChildren) => {
  return (
    <main className="h-auto bg-neutral-100 dark:bg-neutral-950">
      <div className="mx-auto min-h-screen p-4">
        <nav className="flex items-center justify-between">
          <Navbar />
        </nav>
        <div className="flex min-h-[75vh] flex-col items-center justify-center pt-4 md:py-14">
          {children}
        </div>
      </div>
    </main>
  );
};
export default AuthLayout;
