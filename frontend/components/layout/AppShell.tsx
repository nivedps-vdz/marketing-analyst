"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { useGlobalQuery } from "@/lib/filters";

import { Header } from "./Header";
import { Logo } from "./Logo";
import { ProfileCard, Sidebar, SidebarNav } from "./Sidebar";

function MobileNav({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const pathname = usePathname();
  const query = useGlobalQuery();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30 lg:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-card shadow-xl focus:outline-none lg:hidden">
          <div className="flex h-16 items-center justify-between px-5">
            <Logo />
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close navigation"><X className="h-5 w-5" aria-hidden /></Button>
            </Dialog.Close>
          </div>
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>
          <Dialog.Description className="sr-only">Main navigation</Dialog.Description>
          <SidebarNav pathname={pathname} query={query} onNavigate={() => onOpenChange(false)} />
          <ProfileCard />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  useEffect(() => setMenu(false), [pathname]);

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Sidebar />
      <MobileNav open={menu} onOpenChange={setMenu} />
      <div className="lg:pl-[248px]">
        <Header onMenu={() => setMenu(true)} />
        <main id="main" className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
