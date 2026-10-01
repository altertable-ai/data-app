import type { DataAppConfig } from "@altertable/data-app/config";

export default {
  title: "Getting started",
  scope: {
    organization: "Your organization",
    environment: "your environment",
  },
  appearance: {
    theme: "light",
    baseColor: "neutral",
    accentColor: "#405d47",
    density: "comfortable",
    cornerRadius: "medium",
    elevation: "subtle",
    typography: {
      body: "system",
      heading: "system",
    },
  },
} satisfies DataAppConfig;
