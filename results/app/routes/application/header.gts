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
      <LinkTo @route="compare">
        Compare
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

  <style scoped>
    header {
      background: var(--light-bg);
      color: var(--light-fg);
      box-shadow: 0 4px 4px -4px rgba(0, 0, 0, 0.2);
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

    @media (prefers-color-scheme: dark) {
      header {
        background: var(--dark-bg);
        color: var(--dark-fg);
      }
    }

    .home-link {
      text-decoration: none;
      color: currentColor;

      &:hover {
        text-decoration: underline;
      }
    }

    @media (width <=450px) {
      .hide-sm {
        display: none;
      }
    }
  </style>
</template>;
