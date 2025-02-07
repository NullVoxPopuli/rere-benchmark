export const Header = <template>
  <header>
    <span>
      Reactivity + Rendering Benchmark
    </span>
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
