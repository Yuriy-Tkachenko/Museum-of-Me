import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:pointer-events-none disabled:opacity-50", {
  variants: { variant: { default: "bg-ink text-paper hover:bg-ink/80", outline: "border border-ink/20 bg-transparent hover:bg-ink hover:text-paper", lime: "bg-accent text-ink hover:brightness-95" }, size: { default: "h-12 px-6", sm: "h-9 px-4 text-xs", lg: "h-14 px-8 text-base" } },
  defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export function Button({ className, variant, size, ...props }: ButtonProps) { return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />; }
