import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50", {
  variants: { variant: { default: "bg-accent text-paper hover:brightness-110", outline: "border border-accent/30 bg-transparent hover:bg-ink hover:text-paper", lime: "bg-accent text-paper hover:brightness-95" }, size: { default: "h-12 px-6", sm: "h-9 px-4 text-xs", lg: "h-14 px-8 text-base" } },
  defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export function Button({ className, variant, size, ...props }: ButtonProps) { return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />; }
