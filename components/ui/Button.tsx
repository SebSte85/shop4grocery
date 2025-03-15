import { Text, TouchableOpacity, TouchableOpacityProps } from "react-native";
import { twMerge } from "tailwind-merge";

interface ButtonProps extends TouchableOpacityProps {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const variantStyles = {
  primary: "bg-blue-500 active:bg-blue-600",
  secondary: "bg-gray-500 active:bg-gray-600",
  outline: "border border-gray-300 active:bg-gray-100",
};

const sizeStyles = {
  sm: "px-3 py-1.5",
  md: "px-4 py-2",
  lg: "px-6 py-3",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      className={twMerge(
        "rounded-lg items-center justify-center",
        variantStyles[variant],
        sizeStyles[size],
        variant === "outline" ? "border-2" : "",
        className
      )}
      {...props}
    >
      <Text
        className={twMerge(
          "font-medium",
          variant === "outline" ? "text-gray-700" : "text-white"
        )}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}
