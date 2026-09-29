import Application from "@ember/application";
import setupInspector from "@embroider/legacy-inspector-support/ember-source-4.12";

import PageTitleService from "ember-page-title/services/page-title";

import { customLayout } from "./custom-layout.ts";

export default class App extends Application {
  modules = {
    ...import.meta.glob("./router.ts", { eager: true }),
    ...customLayout(import.meta.glob("./routes/**/+{route,template}.{ts,gts}", { eager: true })),
    ...import.meta.glob("./services/**/*.{js,ts}", { eager: true }),
    "./services/page-title": PageTitleService,
  };

  inspector = setupInspector(this);
}
