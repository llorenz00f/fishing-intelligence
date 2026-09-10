import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fishing Intelligence",
    short_name: "Fish Intel",
    description: "Previsioni, score spiegabile e diario personale per la pesca nel Mediterraneo.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#06151D",
    theme_color: "#06151D",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
