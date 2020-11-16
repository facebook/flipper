import React from 'react';
import {PluginClient, usePlugin, createState, useValue, Layout} from 'flipper-plugin';

type Data = {
  id: string;
  message?: string;
};

type Events = {
  newData: Data;
};

// Read more: https://fbflipper.com/docs/tutorial/js-custom#creating-a-first-plugin
// API: https://fbflipper.com/docs/extending/flipper-plugin#pluginclient
export function plugin(client: PluginClient<Events, {}>) {
  const data = createState<Record<string, Data>>({}, {persist: 'data'});

  client.onMessage('newData', (newData) => {
    data.update((draft) => {
      draft[newData.id] = newData;
    });
  });

  client.addMenuEntry({
    action: 'clear',
    handler: async () => {
      data.set({});
    },
  });

  return {data};
}

// Read more: https://fbflipper.com/docs/tutorial/js-custom#building-a-user-interface-for-the-plugin
// API: https://fbflipper.com/docs/extending/flipper-plugin#react-hooks
export function Component() {
  const instance = usePlugin(plugin);
  const data = useValue(instance.data);

  return (
    <Layout.ScrollContainer>
      {Object.entries(data).map(([id, d]) => (
        <pre key={id} data-testid={id}>
          {JSON.stringify(d)}
        </pre>
      ))}
    </Layout.ScrollContainer>
  );
}
