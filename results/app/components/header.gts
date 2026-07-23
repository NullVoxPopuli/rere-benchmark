import { LinkTo } from "@ember/routing";

export const Header = <template>
  <header>
    <LinkTo @route="application" class="home-link">
      Reactivity + Rendering
      <span class="hide-sm">Benchmark</span>
    </LinkTo>
    <span>
      <LinkTo @route="history">
        History
      </LinkTo>
      |
      <a
        href="https://github.com/NullVoxPopuli/rere-benchmark"
        target="_blank"
        rel="noopener noreferrer"
      >
        GitHub
      </a>
    </span>
  </header>

  <style>
    header {
      width: 100%;
      height: var(--header-height);
      position: sticky;
      top: 0;
      /* above the table's sticky header row and corner cell */
      z-index: 4;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
  </style>
</template>;
