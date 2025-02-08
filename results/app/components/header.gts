import { LinkTo } from '@ember/routing';

export const Header = <template>
  <header>
    <LinkTo @route="application" class="home-link">
      Reactivity + Rendering Benchmark
    </LinkTo>
    <span>
      <a href="https://github.com/NullVoxPopuli/rere-benchmark">
        GitHub
      </a>
    </span>
  </header>

  <style>
    header {
      width: 100%;
      height: 64px;
      position: sticky;
      top: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid lightgray;
      margin-bottom: 1rem;
    }
  </style>
</template>;
