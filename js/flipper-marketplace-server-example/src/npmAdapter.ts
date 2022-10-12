import fetch from 'node-fetch';
/**
 * -- ADAPTER EXAMPLE CODE --
 * 
 * List of all internal plugins published on: npm.verdaccio.io
 * 
 * The motivation behind static config is that verdaccio search API does not index
 * all plugins reliably, so we don't have 100% guarantee all plugins will be returned.
 * 
 * FIXME: Can be replaced by API search query, but verdaccio does not provide stable full-text search.
 */

const internalPlugins = [
    'flipper-plugin-xxx',
    'flipper-plugin-xxx-2'
];

// NPM server URL
const NPM_PACKAGE_DETAIL_URL = 'https://npm.verdaccio.io';

type VerdaccioPlugin = {
    error: boolean;
    'dist-tags': {
        latest: string;
    };
    versions: Record<string, {
        dist: {
            tarball: string;
        }
    }>
};

type FlipperMarketplacePlugin = {

}

export async function getAllPlugins() {
    try {
        const plugins: Array<VerdaccioPlugin> = await Promise.all(internalPlugins.map(async pluginName => {
            const response = await fetch(`${NPM_PACKAGE_DETAIL_URL}/${pluginName}`);
            const pluginDetail = await response.json();
            return pluginDetail as VerdaccioPlugin;
        }));
        // Some unpublished plugins will return error message (maybe can log those for debug)
        const filterErrorPlugins = plugins.filter(plugin => !plugin.error);

        // Remap the verdaccio package structure to flipper
        const flipperPlugins: Array<FlipperMarketplacePlugin> = filterErrorPlugins.map(plugin => ({
            ...plugin,
            // spread the package.json of latest package
            ...plugin.versions[plugin['dist-tags']?.latest],
            downloadUrl: plugin.versions[plugin['dist-tags']?.latest].dist.tarball,
            availableVersions: Object.values(plugin.versions).map(plugin => ({
                ...plugin,
                downloadUrl: plugin.dist.tarball,
            })),
            // Provide defaults
            isActivatable: false,
            isBundled: false,
            isEnabledByDefault: false,
        }))
        return flipperPlugins;
    } catch (e) {
        console.error('Retrieving packages failed', e);
        return [];
    }
}