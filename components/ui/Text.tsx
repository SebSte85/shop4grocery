import { Text as RNText, TextProps as RNTextProps } from "react-native";
import { twMerge } from "tailwind-merge";

interface TextProps extends RNTextProps {
  variant?: "regular" | "medium" | "semibold" | "bold" | "extrabold" | "light";
}

export function Text({
  children,
  className,
  variant = "regular",
  ...props
}: TextProps) {
  const baseStyle = "text-white";
  const variantStyles = {
    regular: "font-rubik",
    medium: "font-rubik-medium",
    semibold: "font-rubik-semibold",
    bold: "font-rubik-bold",
    extrabold: "font-rubik-extrabold",
    light: "font-rubik-light",
  };

  return (
    <RNText
      className={twMerge(baseStyle, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </RNText>
  );
}
