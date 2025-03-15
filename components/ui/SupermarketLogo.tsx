import { Image } from "react-native";
import { POPULAR_SUPERMARKETS } from "@/constants/supermarkets";

interface SupermarketLogoProps {
  name: string;
  size?: number;
}

export function SupermarketLogo({ name, size = 32 }: SupermarketLogoProps) {
  // Suche nach einem Match in den populären Supermärkten
  const supermarket = POPULAR_SUPERMARKETS.find((s) =>
    name.toUpperCase().includes(s.name.toUpperCase())
  );

  // Wenn es ein populärer Supermarkt ist, nutze die vordefinierte Domain
  const domain =
    supermarket?.domain || `${name.toLowerCase().replace(/\s+/g, "")}.de`;

  return (
    <Image
      source={{ uri: `https://logo.clearbit.com/${domain}` }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
