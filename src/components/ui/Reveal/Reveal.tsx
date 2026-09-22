import { motion, type HTMLMotionProps } from "framer-motion";
import { type ReactNode } from "react";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";

type RevealProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
  delay?: number;
};

export const Reveal = ({ children, delay = 0, ...props }: RevealProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 34, filter: "blur(8px)" }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.78, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
};
