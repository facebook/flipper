/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {promisify} from 'util';
import fs from 'fs-extra';
import os from 'os';
import {
  openssl,
  isInstalled as opensslInstalled,
} from './openssl-wrapper-with-promises';
import path from 'path';
import tmp, {FileOptions} from 'tmp';
import {reportPlatformFailures} from 'flipper-common';
import {isTest} from 'flipper-common';
import {flipperDataFolder} from '../../utils/paths';
import * as jwt from 'jsonwebtoken';
import {Mutex} from 'async-mutex';
import {createSecureContext} from 'tls';

const tmpFile = promisify(tmp.file) as (
  options?: FileOptions,
) => Promise<string>;

const getFilePath = (filename: string): string => {
  return path.resolve(flipperDataFolder, 'certs', filename);
};

// Desktop file paths
export const caKey = getFilePath('ca.key');
export const caCert = getFilePath('ca.crt');
export const serverKey = getFilePath('server.key');
export const serverCsr = getFilePath('server.csr');
export const serverSrl = getFilePath('server.srl');
export const serverCert = getFilePath('server.crt');
export const serverAuthToken = getFilePath('auth.token');

// Device file paths
export const csrFileName = 'app.csr';
export const deviceCAcertFile = 'sonarCA.crt';
export const deviceClientCertFile = 'device.crt';

const caSubject = '/C=US/ST=CA/L=Menlo Park/O=Sonar/CN=SonarCA';
const serverSubject = '/C=US/ST=CA/L=Menlo Park/O=Sonar/CN=localhost';
const minCertExpiryWindowSeconds = 24 * 60 * 60;
const allowedAppNameRegex = /^[\w.-]+$/;

const logTag = 'certificateUtils';
/*
 * RFC2253 specifies the unamiguous x509 subject format.
 * However, even when specifying this, different openssl implementations
 * wrap it differently, e.g "subject=X" vs "subject= X".
 */
const x509SubjectCNRegex = /[=,]\s*CN=([^,]*)(,.*)?$/;

export type SecureServerConfig = {
  key: Buffer;
  cert: Buffer;
  ca: Buffer;
  requestCert: boolean;
  rejectUnauthorized: boolean;
};

export const ensureOpenSSLIsAvailable = async (): Promise<void> => {
  if (!(await opensslInstalled())) {
    throw new Error(
      "It looks like you don't have OpenSSL installed. Please install it to continue.",
    );
  }
};

let serverConfig: SecureServerConfig | undefined;
export const loadSecureServerConfig = async (): Promise<SecureServerConfig> => {
  if (serverConfig) {
    return serverConfig;
  }

  await ensureOpenSSLIsAvailable();
  await certificateSetup();
  await generateAuthToken();

  const [key, cert, ca] = await Promise.all([
    fs.readFile(serverKey),
    fs.readFile(serverCert),
    fs.readFile(caCert),
  ]);
  serverConfig = {
    key,
    cert,
    ca,
    requestCert: true,
    rejectUnauthorized: true, // can be false if necessary as we don't strictly need to verify the client
  };
  return serverConfig;
};

export const extractBundleIdFromCSR = async (csr: string): Promise<string> => {
  const path = await writeToTempFile(csr);
  const subject = await openssl('req', {
    in: path,
    noout: true,
    subject: true,
    nameopt: true,
    RFC2253: false,
  });
  await fs.unlink(path);
  const matches = subject.trim().match(x509SubjectCNRegex);
  if (!matches || matches.length < 2) {
    throw new Error(`Cannot extract CN from ${subject}`);
  }
  const appName = matches[1];
  if (!appName.match(allowedAppNameRegex)) {
    throw new Error(
      `Disallowed app name in CSR: ${appName}. Only alphanumeric characters and '.' allowed.`,
    );
  }
  return appName;
};

export const generateClientCertificate = async (
  csr: string,
): Promise<string> => {
  console.debug('Creating new client cert', logTag);

  return writeToTempFile(csr).then((path) => {
    return openssl('x509', {
      req: true,
      in: path,
      CA: caCert,
      CAkey: caKey,
      CAcreateserial: true,
      CAserial: serverSrl,
    });
  });
};

export const getCACertificate = async (): Promise<string> => {
  return fs.readFile(caCert, 'utf-8');
};

const certificateSetup = async () => {
  if (isTest()) {
    throw new Error('Server certificates not available in test');
  } else {
    await reportPlatformFailures(
      ensureServerCertExists(),
      'ensureServerCertExists',
    );
  }
};

const mutex = new Mutex();
const ensureServerCertExists = async (): Promise<void> => {
  return mutex.runExclusive(async () => {
    const certs = await Promise.all([
      fs.readFile(serverKey).catch(() => ''),
      fs.readFile(serverCert).catch(() => ''),
      fs.readFile(caCert).catch(() => ''),
    ]);

    if (!certs.every(Boolean)) {
      console.info('No certificates were found, generating new ones');
      await generateServerCertificate();
    } else {
      try {
        console.info('Checking for certificates validity');
        await checkCertIsValid(serverCert);
        console.info('Checking certificate was issued by current CA');
        await verifyServerCertWasIssuedByCA();
        console.info('Checking certs can be used for TLS');
        // https://fb.workplace.com/groups/flippersupport/posts/1712654405881877/
        createSecureContext({
          key: certs[0],
          cert: certs[1],
          ca: certs[2],
        });
        console.info('Current certificates are valid');
      } catch (e) {
        console.warn('Not all certificates are valid, generating new ones', e);
        await generateServerCertificate();
      }
    }
  });
};

const generateServerCertificate = async (): Promise<void> => {
  await ensureCertificateAuthorityExists();
  console.warn('Creating new server certificate');
  await openssl('genrsa', {out: serverKey, '2048': false});
  await openssl('req', {
    new: true,
    key: serverKey,
    out: serverCsr,
    subj: serverSubject,
  });
  await openssl('x509', {
    req: true,
    in: serverCsr,
    CA: caCert,
    CAkey: caKey,
    CAcreateserial: true,
    CAserial: serverSrl,
    out: serverCert,
  });
};

const ensureCertificateAuthorityExists = async (): Promise<void> => {
  if (!(await fs.pathExists(caKey))) {
    return generateCertificateAuthority();
  }
  return checkCertIsValid(caCert).catch(() => generateCertificateAuthority());
};

const generateCertificateAuthority = async (): Promise<void> => {
  if (!(await fs.pathExists(getFilePath('')))) {
    await fs.mkdir(getFilePath(''), {recursive: true});
  }
  console.log('Generating new CA');
  await openssl('genrsa', {out: caKey, '2048': false});
  await openssl('req', {
    new: true,
    x509: true,
    subj: caSubject,
    key: caKey,
    out: caCert,
  });
};

const checkCertIsValid = async (filename: string): Promise<void> => {
  if (!(await fs.pathExists(filename))) {
    throw new Error(`${filename} does not exist`);
  }
  // openssl checkend is a nice feature but it only checks for certificates
  // expiring in the future, not those that have already expired.
  // So we need a separate check for certificates that have already expired
  // but since this involves parsing date outputs from openssl, which is less
  // reliable, keeping both checks for safety.
  try {
    await openssl('x509', {
      checkend: minCertExpiryWindowSeconds,
      in: filename,
    });
  } catch (e) {
    console.warn(`Checking if certificate expire soon: ${filename}`, logTag, e);
    const endDateOutput = await openssl('x509', {
      enddate: true,
      in: filename,
      noout: true,
    });
    const dateString = endDateOutput.trim().split('=')[1].trim();
    const expiryDate = Date.parse(dateString);
    if (isNaN(expiryDate)) {
      console.error(
        'Unable to parse certificate expiry date: ' + endDateOutput,
      );
      throw new Error(
        'Cannot parse certificate expiry date. Assuming it has expired.',
      );
    }
    if (expiryDate <= Date.now() + minCertExpiryWindowSeconds * 1000) {
      throw new Error('Certificate has expired or will expire soon.');
    }
  }
};

const verifyServerCertWasIssuedByCA = async () => {
  const options: {
    [key: string]: any;
  } = {CAfile: caCert};
  options[serverCert] = false;
  const output = await openssl('verify', options);
  const verified = output.match(/[^:]+: OK/);
  if (!verified) {
    // This should never happen, but if it does, we need to notice so we can
    // generate a valid one, or no clients will trust our server.
    throw new Error('Current server cert was not issued by current CA');
  }
};

const writeToTempFile = async (content: string): Promise<string> => {
  const path = await tmpFile();
  await fs.writeFile(path, content);
  return path;
};
export const generateAuthToken = async () => {
  console.info('Generate client authentication token');

  await ensureServerCertExists();

  const privateKey = await fs.readFile(serverKey);
  const token = jwt.sign({unixname: os.userInfo().username}, privateKey, {
    algorithm: 'RS256',
    expiresIn: '21 days',
  });

  await fs.writeFile(serverAuthToken, token);

  return token;
};

/**
 * Gets the client authentication token. If there is no existing token,
 * it generates one, export it to the manifest file and returns it.
 *
 * Additionally, it must check the token's validity before returning it.
 * If the token is invalid, it regenerates it and exports it to the manifest file.
 *
 * Finally, the token is also exported to the manifest, on every get as to
 * ensure it is always up to date.
 *
 * @returns
 */
export const getAuthToken = async (): Promise<string> => {
  if (!(await hasAuthToken())) {
    return generateAuthToken();
  }

  const tokenBuffer = await fs.readFile(serverAuthToken);
  const token = tokenBuffer.toString();

  try {
    console.info('Verify authentication token');
    const serverCertificate = await fs.readFile(serverCert);
    jwt.verify(token, serverCertificate);
    console.info('Token verification succeeded');
  } catch (_) {
    console.warn('Either token has expired or is invalid');
    return generateAuthToken();
  }

  return token;
};

export const hasAuthToken = async (): Promise<boolean> => {
  return fs.pathExists(serverAuthToken);
};

export const validateAuthToken = (token: string) => {
  if (!serverConfig) {
    throw new Error(
      'Unable to validate auth token as no server configuration is available',
    );
  }

  jwt.verify(token, serverConfig.cert);
};
