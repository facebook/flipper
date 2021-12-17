/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import axios from 'axios';
import MemoryStream from 'memorystream';
import {dirSync} from 'tmp';
import * as uuid from 'uuid';
import {commandDownloadFileStartFactory} from '../DownloadFile';

describe('commands', () => {
  describe('DownloadFile', () => {
    let commandDownloadFileStart: ReturnType<
      typeof commandDownloadFileStartFactory
    >;
    let emit: jest.Mock<any>;

    beforeEach(() => {
      emit = jest.fn();
      commandDownloadFileStart = commandDownloadFileStartFactory(emit);
    });

    test('downloads file and reports the progress', async () => {
      const fakeDownloadStream = new MemoryStream();
      const fakeFileSize = 10;
      const fakeHeaders = {
        'content-length': fakeFileSize.toString(),
      };
      const fakeStatus = 200;
      const fakeStatusText = 'Flipper rocks';

      const requestSpy = jest
        .spyOn(axios, 'request')
        .mockImplementation(async () => ({
          headers: fakeHeaders,
          status: fakeStatus,
          statusText: fakeStatusText,
          data: fakeDownloadStream,
        }));

      const {name: tmpDirName} = dirSync({
        unsafeCleanup: true,
      });
      const dest = `${tmpDirName}/flipperTest`;

      expect(requestSpy).toBeCalledTimes(0);

      const fakeDownloadURL = 'https://flipper.rocks';
      const fakeUuid = 'flipper42';
      jest.spyOn(uuid, 'v4').mockImplementation(() => fakeUuid);

      const downloadFileDescriptor = await commandDownloadFileStart(
        fakeDownloadURL,
        dest,
        {
          overwrite: true,
        },
      );

      expect(requestSpy).toBeCalledTimes(1);
      // Expect first argument of the first fn call to amtch object
      expect(requestSpy.mock.calls[0][0]).toMatchObject({
        method: 'GET',
        url: fakeDownloadURL,
      });

      expect(downloadFileDescriptor.headers).toBe(fakeHeaders);
      expect(downloadFileDescriptor.status).toBe(fakeStatus);
      expect(downloadFileDescriptor.statusText).toBe(fakeStatusText);
      expect(downloadFileDescriptor.id).toBe(fakeUuid);

      expect(emit).toBeCalledTimes(0);
      await new Promise((resolve) => fakeDownloadStream.write('Luke', resolve));
      expect(emit).toBeCalledTimes(1);
      expect(emit).toBeCalledWith('download-file-update', {
        id: fakeUuid,
        downloaded: 4,
        totalSize: fakeFileSize,
        status: 'downloading',
      });

      await new Promise((resolve) => fakeDownloadStream.write('Obi', resolve));
      expect(emit).toBeCalledTimes(2);
      expect(emit).toBeCalledWith('download-file-update', {
        id: fakeUuid,
        downloaded: 7,
        totalSize: fakeFileSize,
        status: 'downloading',
      });

      const lastFileUpdateCalled = new Promise((resolve) =>
        emit.mockImplementationOnce(resolve),
      );

      fakeDownloadStream.end();

      await lastFileUpdateCalled;

      expect(emit).toBeCalledTimes(3);
      expect(emit).toBeCalledWith('download-file-update', {
        id: fakeUuid,
        downloaded: 7,
        totalSize: fakeFileSize,
        status: 'success',
      });
    });

    test('rejects "complete" promise if download file readable stream errors', async () => {
      const fakeDownloadStream = new MemoryStream();
      const fakeFileSize = 10;
      const fakeHeaders = {
        'content-length': fakeFileSize.toString(),
      };
      const fakeStatus = 200;
      const fakeStatusText = 'Flipper rocks';

      jest.spyOn(axios, 'request').mockImplementation(async () => ({
        headers: fakeHeaders,
        status: fakeStatus,
        statusText: fakeStatusText,
        data: fakeDownloadStream,
      }));

      const {name: tmpDirName} = dirSync({
        unsafeCleanup: true,
      });
      const dest = `${tmpDirName}/flipperTest`;

      const fakeDownloadURL = 'https://flipper.rocks';
      const fakeUuid = 'flipper42';
      jest.spyOn(uuid, 'v4').mockImplementation(() => fakeUuid);

      await commandDownloadFileStart(fakeDownloadURL, dest, {
        overwrite: true,
      });

      const lastFileUpdateCalled = new Promise((resolve) =>
        emit.mockImplementationOnce(resolve),
      );

      const fakeError = new Error('Ooops');
      fakeDownloadStream.destroy(fakeError);

      await lastFileUpdateCalled;

      expect(emit).toBeCalledTimes(1);
      expect(emit).toBeCalledWith('download-file-update', {
        id: fakeUuid,
        downloaded: 0,
        totalSize: fakeFileSize,
        status: 'error',
        message: 'Ooops',
        stack: expect.anything(),
      });
    });

    test.skip('rejects "complete" promise if writeable stream errors', async () => {
      const fakeDownloadStream = new MemoryStream();
      const fakeFileSize = 10;
      const fakeHeaders = {
        'content-length': fakeFileSize.toString(),
      };
      const fakeStatus = 200;
      const fakeStatusText = 'Flipper rocks';

      jest.spyOn(axios, 'request').mockImplementation(async () => ({
        headers: fakeHeaders,
        status: fakeStatus,
        statusText: fakeStatusText,
        data: fakeDownloadStream,
      }));

      const {name: tmpDirName, removeCallback: removeTmpDir} = dirSync({
        unsafeCleanup: true,
      });
      const dest = `${tmpDirName}/flipperTest`;

      const fakeDownloadURL = 'https://flipper.rocks';
      const fakeUuid = 'flipper42';
      jest.spyOn(uuid, 'v4').mockImplementation(() => fakeUuid);

      await commandDownloadFileStart(fakeDownloadURL, dest, {
        overwrite: true,
      });

      const lastFileUpdateCalled = new Promise<void>((resolve) =>
        emit.mockImplementation(
          (_event, {status}) => status === 'error' && resolve(),
        ),
      );

      // We remove the end file to cause an error
      removeTmpDir();
      fakeDownloadStream.write('Obi');

      await lastFileUpdateCalled;

      expect(emit).toBeCalledTimes(2);
      expect(emit).toHaveBeenNthCalledWith(1, 'download-file-update', {
        id: fakeUuid,
        downloaded: 3,
        totalSize: fakeFileSize,
        status: 'downloading',
      });
      expect(emit).toHaveBeenNthCalledWith(2, 'download-file-update', {
        id: fakeUuid,
        downloaded: 3,
        totalSize: fakeFileSize,
        status: 'error',
        message: expect.stringContaining('ENOENT'),
        stack: expect.anything(),
      });
    });
  });
});
