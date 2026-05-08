"use client";
import React from "react";
import { useSound } from "./useSound";

type Intent = "primary" | "brand" | "correct" | "wrong" | "streak" | "info" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: Intent;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  /** Plays a click sfx on press. Default true. */
  withSound?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const intentRing: Record<Intent, string> = {
  primary: "focus-visible:ring-green-300",
  brand:   "focus-visible:ring-blue-300",
  correct: "focus-visible:ring-green-300",
  wrong:   "focus-visible:ring-red-300",
  streak:  "focus-visible:ring-amber-300",
  info:    "focus-visible:ring-sky-300",
  ghost:   "focus-visible:ring-gray-300",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      intent = "primary",
      size = "md",
      loading = false,
      block = false,
      withSound = true,
      iconLeft,
      iconRight,
      className = "",
      children,
      onClick,
      disabled,
      ...rest
    },
    ref
  ) {
    const sfx = useSound();

    const sizeCls = size === "sm" ? "duo-btn--sm" : size === "lg" ? "duo-btn--lg" : "";
    const blockCls = block ? "w-full" : "";

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (withSound && !disabled && !loading) sfx.click();
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        className={`duo-btn duo-btn--${intent} ${sizeCls} ${blockCls} ${intentRing[intent]} ${className}`}
        onClick={handleClick}
        disabled={disabled || loading}
        {...rest}
      >
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          iconLeft
        )}
        <span>{children}</span>
        {!loading && iconRight}
      </button>
    );
  }
);
