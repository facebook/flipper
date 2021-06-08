/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DataSource, createDataSource} from '../DataSource';

type Todo = {
  id: string;
  title: string;
  done: boolean;
};

function generateTodos(amount: number): Todo[] {
  const res = new Array<Todo>(amount);
  for (let i = 0; i < amount; i++) {
    res[i] = {
      id: 'todo_' + i,
      title:
        '' +
        ((i % 20) * 1000000 + (amount - i)) +
        GKChesterton.replace(/Chesterton/g, '' + i),
      done: i % 3 === 0,
    };
  }
  return res;
}

const defaultFilter = (t: Todo) => !t.done;

type DataSourceish = DataSource<Todo> | FakeDataSource<Todo>;

// NOTE: this run in jest, which is not optimal for perf, but should give some idea
// make sure to use the `yarn watch` script in desktop root, so that the garbage collector is exposed

// By default skipped to not slow down each and every test run
test.skip('run perf test', () => {
  if (!global.gc) {
    console.warn(
      'Warning: garbage collector not available, skipping this test. Make sure to start the test suite using `yarn watch`',
    );
    return;
  }

  const measurements: any = {};

  const smallSize = 50000;
  const largeSize = 100000;
  const smallset = generateTodos(smallSize);
  const largeset = generateTodos(largeSize);

  const opts = {limit: largeSize * 2};
  const datasources = {
    unkeyed: createDataSource(smallset, opts),
    unkeyed_large: createDataSource(largeset, opts),
    keyed: createDataSource(smallset, {key: 'id', ...opts}),
    keyed_large: createDataSource(largeset, {key: 'id', ...opts}),
    unkeyed_sorted: createDataSource(smallset, opts),
    unkeyed_sorted_large: createDataSource(largeset, opts),
    keyed_sorted: createDataSource(smallset, {key: 'id', ...opts}),
    keyed_sorted_large: createDataSource(largeset, {
      key: 'id',
      ...opts,
    }),
    fake_small: new FakeDataSource(smallset),
    fake_large: new FakeDataSource(largeset),
    fake_small_sorted: new FakeDataSource(smallset),
    fake_large_sorted: new FakeDataSource(largeset),
  };

  Object.entries(datasources).forEach(([name, ds]) => {
    ds.view.setWindow(0, 1000000);
    if (name.includes('sorted')) {
      ds.view.setFilter(defaultFilter);
      ds.view.setSortBy('title');
    }
  });

  function measure(title: string, task: (ds: DataSourceish) => void) {
    measurements[title] = {};
    Object.entries(datasources).forEach(([name, ds]) => {
      global.gc?.();
      const start = Date.now();
      task(ds as any);
      if (ds instanceof FakeDataSource) {
        // to 'render' we need to know the end result (this mimics a lazy evaluation of filter / sort)
        // note that this skews the test a bit in favor of fake data source,
        // as DataSource would *always* keep things sorted/ filtered, but doing that would explode the test for append / update :)
        ds.view.buildOutput();
      }
      //   global.gc?.(); // to cleanup our createdmess as part of the measurement
      const duration = Date.now() - start;
      measurements[title][name] = duration;
    });
  }

  measure('append', (ds) => {
    for (let i = 0; i < 1000; i++) {
      ds.append({
        id: 'test_' + i,
        title: i + 'read some more chesterton!',
        done: false,
      });
    }
  });

  measure('update', (ds) => {
    for (let i = 0; i < 1000; i++) {
      ds.update(i, {
        id: 'test_update_' + i,
        title: i + 'read some more chesterton!',
        done: true,
      });
    }
  });

  measure('remove', (ds) => {
    ds.delete(99);
  });

  measure('shift', (ds) => {
    ds.shift(0.1 * smallSize);
  });

  measure('change sorting', (ds) => {
    ds.view.setSortBy('id');
  });

  measure('change filter', (ds) => {
    ds.view.setFilter((t) => t.title.includes('23')); // 23 does not occur in original text
  });

  const sum: any = {};
  Object.entries(measurements).forEach(([_test, entries]: any) => {
    Object.entries(entries).forEach(([ds, duration]) => {
      if (!sum[ds]) sum[ds] = 0;
      sum[ds] += duration;
    });
  });
  measurements.sum = sum;
  console.table(measurements);
});

const GKChesterton = `Gilbert Keith Chesterton KC*SG (29 May 1874 – 14 June 1936) was an English writer,[2] philosopher, lay theologian, and literary and art critic. He has been referred to as the "prince of paradox".[3] Time magazine observed of his writing style: "Whenever possible Chesterton made his points with popular sayings, proverbs, allegories—first carefully turning them inside out."[4]

Chesterton created the fictional priest-detective Father Brown,[5] and wrote on apologetics. Even some of those who disagree with him have recognised the wide appeal of such works as Orthodoxy and The Everlasting Man.[4][6] Chesterton routinely referred to himself as an "orthodox" Christian, and came to identify this position more and more with Catholicism, eventually converting to Catholicism from High Church Anglicanism. Biographers have identified him as a successor to such Victorian authors as Matthew Arnold, Thomas Carlyle, John Henry Newman, and John Ruskin.[7] On his contributions, T. S. Eliot wrote:

He was importantly and consistently on the side of the angels. Behind the Johnsonian fancy-dress, so reassuring to the British public, he concealed the most serious and revolutionary designs—concealing them by exposure ... Chesterton's social and economic ideas...were fundamentally Christian and Catholic. He did more, I think, than any man of his time—and was able to do more than anyone else, because of his particular background, development and abilities as a public performer—to maintain the existence of the important minority in the modern world. He leaves behind a permanent claim upon our loyalty, to see that the work that he did in his time is continued in ours.[8]`;

class FakeDataSource<T> {
  data: ReadonlyArray<T>;
  output!: ReadonlyArray<T>;
  filterFn?: (t: T) => boolean;
  private sortAttr?: keyof T;

  constructor(initial: T[]) {
    this.data = initial;
    this.view.buildOutput();
  }

  view = {
    setWindow: (_start: number, _end: number) => {
      // noop
    },

    setFilter: (filter: (t: T) => boolean) => {
      this.filterFn = filter;
    },

    setSortBy: (k: keyof T) => {
      this.sortAttr = k;
    },

    buildOutput: () => {
      const filtered = this.filterFn
        ? this.data.filter(this.filterFn)
        : this.data;
      const sorted = this.sortAttr
        ? filtered
            .slice()
            .sort((a: any, b: any) =>
              String.prototype.localeCompare.call(
                a[this.sortAttr!],
                b[this.sortAttr!],
              ),
            )
        : filtered;
      this.output = sorted;
    },
  };

  append(v: T) {
    this.data = [...this.data, v];
  }

  update(index: number, v: T) {
    this.data = this.data.slice();
    (this.data as any)[index] = v;
  }

  delete(index: number) {
    this.data = this.data.slice();
    (this.data as any).splice(index, 1);
  }

  shift(amount: number) {
    this.data = this.data.slice(amount);
  }
}
