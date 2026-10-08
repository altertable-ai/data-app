import { injectDataAppStyles, mountDataApp } from "@altertable/data-app/react";
import { App } from "#app/App.tsx";
import { DATA_APP_CONFIG as app } from "#config";

injectDataAppStyles();

mountDataApp({ config: app, component: App });
