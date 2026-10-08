import { defineDataApp } from "@altertable/data-app/config";

export const dataApp = defineDataApp({
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
  queries: { connection: { statement: "SELECT 1 AS connection_check", params: {} } },
});
