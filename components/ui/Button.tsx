import React from "react";
import {
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
} from "react-native";
import { Text } from "./Text";
import { cn } from "@/lib/utils";

export interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button = ({
  children,
  className,
  variant = "primary",
  fullWidth = false,
  isLoading = false,
  disabled,
  ...props
}: ButtonProps) => {
  const variantClasses = {
    primary: "bg-primary-1",
    secondary: "bg-slate-700",
    outline: "border border-slate-700",
    ghost: "bg-transparent",
  };

  return (
    <TouchableOpacity
      className={cn(
        "p-3 rounded-lg",
        variantClasses[variant],
        fullWidth ? "w-full" : "",
        disabled || isLoading ? "opacity-50" : "",
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <Text
          variant="medium"
          className={cn(
            "text-center",
            variant === "outline" || variant === "ghost"
              ? "text-slate-700"
              : "text-white"
          )}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
};
