import { injectDataAppStyles, mountDataApp } from "@altertable/data-app/react";
import { App } from "#app/App.tsx";
import { dataApp } from "#config";
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });
