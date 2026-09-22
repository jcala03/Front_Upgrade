import { type AnchorHTMLAttributes, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "../../../utils/cn";
import "./Button.css";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  withIcon?: boolean;
};

export const Button = ({
  children,
  className,
  variant = "primary",
  withIcon = true,
  ...props
}: ButtonProps) => {
  return (
    <a className={cn("button", `button--${variant}`, className)} {...props}>
      <span>{children}</span>
      {withIcon ? <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" /> : null}
    </a>
  );
};
