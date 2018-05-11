/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {
  PureComponent,
  Button,
  FlexColumn,
  FlexBox,
  Text,
  LoadingIndicator,
  ButtonGroup,
  colors,
  Glyph,
  FlexRow,
  styled,
  Searchable,
} from 'sonar';
const {spawn} = require('child_process');
const path = require('path');
const {app, shell} = require('electron').remote;

const SONAR_PLUGIN_PATH = path.join(app.getPath('home'), '.sonar');
const DYNAMIC_PLUGINS = JSON.parse(window.process.env.PLUGINS || '[]');

type NPMModule = {
  name: string,
  version: string,
  description?: string,
  error?: Object,
};

type Status =
  | 'installed'
  | 'outdated'
  | 'install'
  | 'remove'
  | 'update'
  | 'uninstalled'
  | 'uptodate';

type PluginT = {
  name: string,
  version?: string,
  description?: string,
  status: Status,
  managed?: boolean,
  entry?: string,
  rootDir?: string,
};

type Props = {
  searchTerm: string,
};
type State = {
  plugins: {
    [name: string]: PluginT,
  },
  restartRequired: boolean,
  searchCompleted: boolean,
};

const Container = FlexBox.extends({
  width: '100%',
  flexGrow: 1,
  background: colors.light02,
  overflowY: 'scroll',
});

const Title = Text.extends({
  fontWeight: 500,
});

const Plugin = FlexColumn.extends({
  backgroundColor: colors.white,
  borderRadius: 4,
  padding: 15,
  margin: '0 15px 25px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
});

const SectionTitle = styled.text({
  fontWeight: 'bold',
  fontSize: 24,
  margin: 15,
  marginLeft: 20,
});

const Loading = FlexBox.extends({
  padding: 50,
  alignItems: 'center',
  justifyContent: 'center',
});

const RestartRequired = FlexBox.extends({
  textAlign: 'center',
  justifyContent: 'center',
  fontWeight: 500,
  color: colors.white,
  padding: 12,
  backgroundColor: colors.green,
  cursor: 'pointer',
});

const TitleRow = FlexRow.extends({
  alignItems: 'center',
  marginBottom: 10,
  fontSize: '1.1em',
});

const Description = FlexRow.extends({
  marginBottom: 15,
  lineHeight: '130%',
});

const PluginGlyph = Glyph.extends({
  marginRight: 5,
});

const PluginLoading = LoadingIndicator.extends({
  marginLeft: 5,
  marginTop: 5,
});

const getLatestVersion = (name: string): Promise<NPMModule> => {
  return fetch(`http://registry.npmjs.org/${name}/latest`).then(res =>
    res.json(),
  );
};

const getPluginList = (): Promise<Array<NPMModule>> => {
  return fetch(
    'http://registry.npmjs.org/-/v1/search?text=keywords:sonar&size=250',
  )
    .then(res => res.json())
    .then(res => res.objects.map(o => o.package));
};

const sortByName = (a: PluginT, b: PluginT): 1 | -1 =>
  a.name > b.name ? 1 : -1;

const INSTALLED = ['installed', 'outdated', 'uptodate'];

class PluginItem extends PureComponent<
  {
    plugin: PluginT,
    onChangeState: (action: Status) => void,
  },
  {
    working: boolean,
  },
> {
  state = {
    working: false,
  };

  npmAction = (action: Status) => {
    const {name, status: initialStatus} = this.props.plugin;
    this.setState({working: true});
    const npm = spawn('npm', [action, name], {
      cwd: SONAR_PLUGIN_PATH,
    });

    npm.stderr.on('data', e => {
      console.error(e.toString());
    });

    npm.on('close', code => {
      this.setState({working: false});
      const newStatus = action === 'remove' ? 'uninstalled' : 'uptodate';
      this.props.onChangeState(code !== 0 ? initialStatus : newStatus);
    });
  };

  render() {
    const {
      entry,
      status,
      version,
      description,
      managed,
      name,
      rootDir,
    } = this.props.plugin;

    return (
      <Plugin>
        <TitleRow>
          <PluginGlyph
            name="apps"
            size={24}
            variant="outline"
            color={colors.light30}
          />
          <Title>{name}</Title>
          &nbsp;
          <Text code={true}>{version}</Text>
        </TitleRow>
        {description && <Description>{description}</Description>}
        <FlexRow>
          {managed ? (
            <Text size="0.9em" color={colors.light30}>
              This plugin is not managed by Sonar, but loaded from{' '}
              <Text size="1em" code={true}>
                {rootDir}
              </Text>
            </Text>
          ) : (
            <ButtonGroup>
              {status === 'outdated' && (
                <Button
                  disabled={this.state.working}
                  onClick={() => this.npmAction('update')}>
                  Update
                </Button>
              )}
              {INSTALLED.includes(status) ? (
                <Button
                  disabled={this.state.working}
                  title={
                    managed === true && entry != null
                      ? `This plugin is dynamically loaded from ${entry}`
                      : undefined
                  }
                  onClick={() => this.npmAction('remove')}>
                  Remove
                </Button>
              ) : (
                <Button
                  disabled={this.state.working}
                  onClick={() => this.npmAction('install')}>
                  Install
                </Button>
              )}
              <Button
                onClick={() =>
                  shell.openExternal(`https://www.npmjs.com/package/${name}`)
                }>
                Info
              </Button>
            </ButtonGroup>
          )}
          {this.state.working && <PluginLoading size={18} />}
        </FlexRow>
      </Plugin>
    );
  }
}

class PluginManager extends PureComponent<Props, State> {
  state = {
    plugins: DYNAMIC_PLUGINS.reduce((acc, plugin) => {
      acc[plugin.name] = {
        ...plugin,
        managed: !(plugin.entry, '').startsWith(SONAR_PLUGIN_PATH),
        status: 'installed',
      };
      return acc;
    }, {}),
    restartRequired: false,
    searchCompleted: false,
  };

  componentDidMount() {
    Promise.all(
      Object.keys(this.state.plugins)
        .filter(name => this.state.plugins[name].managed)
        .map(getLatestVersion),
    ).then((res: Array<NPMModule>) => {
      const updates = {};
      res.forEach(plugin => {
        if (
          plugin.error == null &&
          this.state.plugins[plugin.name].version !== plugin.version
        ) {
          updates[plugin.name] = {
            ...plugin,
            ...this.state.plugins[plugin.name],
            status: 'outdated',
          };
        }
      });
      this.setState({
        plugins: {
          ...this.state.plugins,
          ...updates,
        },
      });
    });

    getPluginList().then(pluginList => {
      const plugins = {...this.state.plugins};
      pluginList.forEach(plugin => {
        if (plugins[plugin.name] != null) {
          plugins[plugin.name] = {
            ...plugin,
            ...plugins[plugin.name],
            status:
              plugin.version === plugins[plugin.name].version
                ? 'uptodate'
                : 'outdated',
          };
        } else {
          plugins[plugin.name] = {
            ...plugin,
            status: 'uninstalled',
          };
        }
      });
      this.setState({
        plugins,
        searchCompleted: true,
      });
    });
  }

  onChangePluginState = (name: string, status: Status) => {
    this.setState({
      plugins: {
        ...this.state.plugins,
        [name]: {
          ...this.state.plugins[name],
          status,
        },
      },
      restartRequired: true,
    });
  };

  relaunch() {
    app.relaunch();
    app.exit(0);
  }

  render() {
    // $FlowFixMe
    const plugins: Array<PluginT> = Object.values(this.state.plugins);
    const availablePlugins = plugins.filter(
      ({status}) => !INSTALLED.includes(status),
    );
    return (
      <Container>
        <FlexColumn fill={true}>
          {this.state.restartRequired && (
            <RestartRequired onClick={this.relaunch}>
              <Glyph name="arrows-circle" size={12} color={colors.white} />
              &nbsp; Restart Required: Click to Restart
            </RestartRequired>
          )}
          <SectionTitle>Installed Plugins</SectionTitle>
          {plugins
            .filter(
              ({status, name}) =>
                INSTALLED.includes(status) &&
                name.indexOf(this.props.searchTerm) > -1,
            )
            .sort(sortByName)
            .map((plugin: PluginT) => (
              <PluginItem
                plugin={plugin}
                key={plugin.name}
                onChangeState={action =>
                  this.onChangePluginState(plugin.name, action)
                }
              />
            ))}
          <SectionTitle>Available Plugins</SectionTitle>
          {availablePlugins
            .filter(({name}) => name.indexOf(this.props.searchTerm) > -1)
            .sort(sortByName)
            .map((plugin: PluginT) => (
              <PluginItem
                plugin={plugin}
                key={plugin.name}
                onChangeState={action =>
                  this.onChangePluginState(plugin.name, action)
                }
              />
            ))}
          {!this.state.searchCompleted && (
            <Loading>
              <LoadingIndicator size={32} />
            </Loading>
          )}
        </FlexColumn>
      </Container>
    );
  }
}

const SearchablePluginManager = Searchable(PluginManager);

export default class extends PureComponent<{}> {
  render() {
    return (
      <FlexColumn fill={true}>
        <SearchablePluginManager />
      </FlexColumn>
    );
  }
}
