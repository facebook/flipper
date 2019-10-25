---
id: js-table
title: Showing a table
---

Now that we have the native side covered, let's display the data we're sending
on the desktop side.

![Android Tutorial App](assets/android-tutorial-desktop.png)

## Dynamic Plugin loading

By default, Flipper will start with the plugins it was bundled with. You can
configure it to also look for plugins in custom directories. To do that,
modify the `~/.flipper/config.json` file that is created the first time
you start Flipper and add a newly created directory the `pluginPaths` attribute.

Your file will then look something like this:

```json
{
  "pluginPaths": [
    "~/.flipper/custom-plugins/"
  ],
  ...
}
```

## Creating the Plugin Package

With the loading part out of the way, we can create the new plugin. For that, first
create a new folder inside the custom plugins directory. Then use `yarn init` (`npm init` if that's more your style)
to initialise a new JavaScript package:

```bash
$ cd ~/.flipper/custom-plugins/
$ mkdir sea-mammals
$ cd sea-mammals
$ yarn init
```

When choosing the package name, remember to use the name we have specified on the native side as ID.
In our case, that is "sea-mammals". Once done, open the `package.json`. In addition to the name,
you can also specify a title to show in the Flipper sidebar and an icon to display here. For instance:

```json
{
  "name": "sea-mammals",
  "version": "1.0.0",
  "main": "index.tsx",
  "license": "MIT",
  "keywords": ["flipper-plugin"],
  "icon": "apps",
  "title": "Sea Mammals",
  "dependencies": {
    "flipper": "latest"
  }
}
```
*See [package.json](https://github.com/facebook/flipper/blob/master/src/plugins/seamammals/package.json)*

## Building a Table

We have found that one of the most useful things you can do to understand how your app works
is to give you easy access to the underlying data used to display items on screen. A very
easy way of doing this is by showing the data in a table. We have optimized for this
particular use case that makes it dead-simple to expose your data in a table that you
can sort, filter and select items for more detailed information.

### Row Types

We start by defining what our table rows look like as types:

```javascript
type Id = number;

type Row = {
  id: Id,
  title: string,
  url: string,
};
```

It is important that you have some unique identifier for every row so
that we know when something new was added to the table. We will use the
`id` field here for this purpose.

### Columns

Next, we define which columns to show and how to display them:

```javascript
const columns = {
  title: {
    value: 'Title',
  },
  url: {
    value: 'URL',
  },
};

const columnSizes = {
  title: '15%',
  url: 'flex',
};
```

The keys used here will show up again in the next step when building
your rows, so keep them consistent. The `value` we define for each column will show up as the header at the top of the table.

For the size you can either choose a fixed proportion or choose `flex`
to distribute the remaining available space.

### Sidebar

When clicking on an element in your table, you can display a sidebar
which gives more detail about an object than what is shown inline in the
table. You could, for instance, show images that you referenced.
For this tutorial, however, we will just show the full object by
using our `ManagedDataInspector` UI component:

```javascript
function renderSidebar(row: Row) {
  return (
    <Panel floating={false} heading={'Info'}>
      <ManagedDataInspector data={row} expandRoot={true} />
    </Panel>
  );
}
```

You'll notice how the function takes the `Row` type we have defined
before and returns a React component. What you render in this sidebar is
entirely up to you.

### Building Rows

In the same way that we create our sidebar from a `Row`, we
also render individual rows in our table but instead of a React
component, we provide a description of the data based
on the column keys we have set up before.

```javascript
function buildRow(row: Row): TableBodyRow {
  return {
    columns: {
      title: {
        value: <Text>{row.title}</Text>,
        filterValue: row.title,
      },
      url: {
        value: <Text>{row.url}</Text>,
        filterValue: row.url,
      },
    },
    key: row.id,
    copyText: JSON.stringify(row),
    filterValue: `${row.title} ${row.url}`,
  };
}
```

The `title` and `url` fields correspond to the keys
we have previously set up as part of the `columns`
object.

`filterValue` is used to power the search bar at the top
of the table. Defining `copyText` allows you to come up
with a serialization scheme so users can right-click on
any row and copy the content to their clipboard.

### Putting it all to work

Now that we've build all the individual pieces, we
just need to hook it all up using `createTablePlugin`:

```javascript
export default createTablePlugin<Row>({
  method: 'newRow',
  columns,
  columnSizes,
  renderSidebar,
  buildRow,
});
```
*See [index.tsx](https://github.com/facebook/flipper/blob/master/src/plugins/seamammals/index.tsx)*

The `method` we define here corresponds to the name
of the function we call on the native side to inform
the desktop about new data we want to display.

And that's it! Starting Flipper will now compile your
plugin and connect to the native side. It's a good
idea to start Flipper from the command line to see
any potential errors. The console in the DevTools
is a great source of information if something doesn't
work as expected, too.

## What's next?

You now have an interactive table that you can sort,
filter and use to get additional information about
the stuff you see on screen.

For many cases, this is already all you need. However,
sometimes you want to go the extra mile and want
to build something a bit more custom. That's what
we're going to do in the next part of our tutorial.
