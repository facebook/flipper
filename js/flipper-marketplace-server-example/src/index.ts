import express from 'express';
import cache from 'route-cache';

import { getAllPlugins } from './npmAdapter';

const indexServer = express();
const port = process.env['PORT'] || 4004;
const pluginsRouteCache = 600; // 10 minutes

/**
 * List plugins
 * 
 * Cache: Allow cache to lower the ammount of requests sent to npmAdapter.
 * Each Flipper app will periodically request for plugins, so the more clients we need to serve
 * the more requests need to be processed and handled by the npm server.
 * This will also speed up the response, since it will be served mostly from cache.
 * 
 */
indexServer.get('/flipper-plugins', cache.cacheSeconds(pluginsRouteCache), async (req, res) => {
  const plugins = await getAllPlugins();
  res.format({
    'application/json': () => {
      res.send(plugins)
    }
  })
})

indexServer.listen(port, () => {
  console.log(`Flipper index server listening on port ${port}`)
})