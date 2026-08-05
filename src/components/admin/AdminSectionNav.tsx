"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface AdminSectionTab {
  href: string;
  label: string;
}

interface Props {
  title: string;
  description: string;
  tabs: AdminSectionTab[];
}

export default function AdminSectionNav({ title, description, tabs }: Props) {
  const pathname = usePathname();

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <nav className="mt-5 flex flex-wrap gap-2 border-b border-slate-200 pb-px">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`-mb-px rounded-t-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "border border-b-white border-slate-200 bg-white text-brand-800"
                  : "border border-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
