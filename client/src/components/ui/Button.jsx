import { m } from "motion/react";

/* Site buttons. Visual style lives in design-system.css (.ot-btn-*);
   Motion adds the physical feedback: a 1px lift on hover, a slight press on
   tap. Under prefers-reduced-motion, MotionConfig (Root.jsx) drops them. */

const VARIANT = {
  primary: "ot-btn-primary",
  secondary: "ot-btn-secondary",
  light: "ot-btn-light",
  ghostDark: "ot-btn-ghost-dark",
};

const HOVER = { y: -1 };
const TAP = { scale: 0.97, y: 0 };
const SPRING = { type: "spring", stiffness: 500, damping: 30 };

function classes(variant, size, className) {
  return ["ot-btn", VARIANT[variant] ?? VARIANT.primary, size === "sm" && "ot-btn-sm", className]
    .filter(Boolean)
    .join(" ");
}

export function Button({ variant = "primary", size, className, type = "button", children, ...rest }) {
  return (
    <m.button
      type={type}
      whileHover={rest.disabled ? undefined : HOVER}
      whileTap={rest.disabled ? undefined : TAP}
      transition={SPRING}
      className={classes(variant, size, className)}
      {...rest}
    >
      {children}
    </m.button>
  );
}

export function ButtonLink({ variant = "primary", size, className, children, ...rest }) {
  return (
    <m.a
      whileHover={HOVER}
      whileTap={TAP}
      transition={SPRING}
      className={classes(variant, size, className)}
      {...rest}
    >
      {children}
    </m.a>
  );
}
