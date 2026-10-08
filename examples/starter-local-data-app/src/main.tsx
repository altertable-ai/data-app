import { injectDataAppStyles, mountDataApp } from "@altertable/data-app/react";
import { App } from "#app/App.tsx";
import { dataApp as app } from "#config";

injectDataAppStyles();

mountDataApp({ app, component: App });
