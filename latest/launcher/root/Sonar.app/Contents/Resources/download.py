#!/usr/bin/env python

import urllib
import json
import os
import tempfile
import tarfile
import shutil
import sys

# constants
cache_dir = os.path.expanduser('~/.sonar-desktop')
cache_version_loc = cache_dir + '/.sonarversion'

# fetch latest version info
version_url = (
    'https://interngraph.intern.facebook.com/sonar/version'
    '?app=543626909362475&token=AeNRaexWgPooanyxG0'
)
version_data = json.loads(urllib.urlopen(version_url).read())

# we have sonar cached, check if the version is the same
if os.path.isfile(cache_version_loc):
    cached_version = open(cache_version_loc).read()
    if cached_version == version_data['version']:
        print 'Sonar is up to date.'
        quit()

# initiate the upgrade process
print 'Downloading new version of Sonar...'

# pick tarball url
if sys.platform == 'darwin':
    tarball_url = version_data['urls']['osx']
elif sys.platform.startswith('linux'):
    tarball_url = version_data['urls']['linux']
else:
    raise Exception('Unknown platform')

# download new version tarball
tarball_loc = tempfile.mkstemp()[1]
print 'Downloading ' + tarball_url + ' to ' + tarball_loc
tarball_download = urllib.URLopener()
tarball_download.retrieve(tarball_url, tarball_loc)

tmp_cache_dir = tempfile.mkdtemp('sonar')

# extract new version
print 'Download complete. Extracting to ' + tmp_cache_dir
tar = tarfile.open(tarball_loc)
tar.extractall(path=tmp_cache_dir)
tar.close()

# delete tarball
os.remove(tarball_loc)

# clean up old install
if os.path.isdir(cache_version_loc):
    shutil.rmtree(cache_dir)

# replace old directory with new one
shutil.move(tmp_cache_dir, cache_dir)

# write new hash
open(cache_version_loc, 'w').write(version_data['version'])

# finished!
print 'Upgrade complete.'
