import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface ServiceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

export default function ServiceCard({ title, description, icon: Icon, href }: ServiceCardProps) {
  return (
    <div className="group relative rounded-2xl bg-white p-8 shadow-md transition-all hover:-translate-y-2 hover:shadow-xl border border-slate-100">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mb-3 text-xl font-bold text-slate-900">{title}</h3>
      <p className="mb-6 text-sm leading-6 text-slate-600">
        {description}
      </p>
      <Link
        href={href}
        className="text-sm font-semibold text-blue-600 hover:text-blue-500 flex items-center gap-1 group/link"
      >
        Learn more
        <span className="transition-transform group-hover/link:translate-x-1">→</span>
      </Link>
    </div>
  );
}
