import { pageTitle } from 'ember-page-title';

import { Header } from '#components/header.gts';

<template>
  {{pageTitle "Reactivity + Rendering Benchmark"}}

  <Header />

  <main>{{outlet}}</main>
</template>
