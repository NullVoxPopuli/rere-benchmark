import { LinkTo } from '@ember/routing';

export const Header = <template>
  <header>
    <LinkTo @route="application" class="home-link">
      Reactivity + Rendering Benchmark
    </LinkTo>
    <span>
      <LinkTo @route="history">
        History
      </LinkTo>
      |
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
      margin-bottom: 1rem;
      background: white;
      box-shadow: 0 4px 4px -4px rgba(0, 0, 0, 0.2);
    }
  </style>
</template>;
