"use client";

import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  color: string;
}

export default function StatCard({ title, value, change, changeType, icon: Icon }: StatCardProps) {
  return (
    <div className="fx-card fx-card-interactive p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="fx-eyebrow">{title}</p>
        <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
      </div>
      <p className="fx-num text-[28px] font-semibold text-card-foreground mt-3 leading-none">{value}</p>
      <p className={`text-xs font-medium mt-2.5 ${changeType === "positive" ? "text-success" : changeType === "negative" ? "text-danger" : "text-muted-foreground"}`}>
        {change}
      </p>
    </div>
  );
}
