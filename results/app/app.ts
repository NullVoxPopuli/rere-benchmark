import setupInspector from "@embroider/legacy-inspector-support/ember-source-4.12";

import PageTitleService from "ember-page-title/services/page-title";
import Application from "ember-strict-application-resolver";

export default class App extends Application {
  modules = {
    ...import.meta.glob("./router.ts", { eager: true }),
    ...import.meta.glob("./templates/**/*.{gjs,gts,js,ts}", { eager: true }),
    ...import.meta.glob("./routes/**/*.{js,ts}", { eager: true }),
    ...import.meta.glob("./services/**/*.{js,ts}", { eager: true }),
    "./services/page-title": PageTitleService,
  };

  inspector = setupInspector(this);
}
