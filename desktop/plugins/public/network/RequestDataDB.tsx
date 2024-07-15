/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {openDB, deleteDB, DBSchema, IDBPDatabase} from 'idb';
import {Request, RequestWithData} from './types';
interface RequestDBSchema extends DBSchema {
  requests: {
    key: string;
    value: string | Uint8Array | undefined;
  };
  responses: {
    key: string;
    value: string | Uint8Array | undefined;
  };
}
export type Data = string | Uint8Array | undefined;

let shouldWipeDB = true;
let instanceId = 0;

const dbName = 'network-plugin-data';

export class RequestDataDB {
  private dbPromise: Promise<IDBPDatabase<RequestDBSchema>> | null = null;
  private instanceId: string;
  constructor() {
    this.instanceId = (instanceId++).toString();
  }
  private async initializeDB(): Promise<IDBPDatabase<RequestDBSchema>> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = (async () => {
      if (shouldWipeDB) {
        shouldWipeDB = false;
        console.log('[network] Deleting database');

        try {
          await this.deleteDBWithTimeout();
          console.log('[network] Database deleted successfully');
        } catch (e) {
          console.warn('[network] Failed to delete database', e);
        }
      }
      return openDB<RequestDBSchema>(dbName, 1, {
        upgrade(db) {
          db.createObjectStore('requests');
          db.createObjectStore('responses');
          console.log('[network] Created db object stores', dbName);
        },
      });
    })();
    return this.dbPromise;
  }
  deleteDBWithTimeout(timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new Error(
            '[network] Timeout: Unable to delete database, probably due to open connections',
          ),
        );
      }, timeout);
      deleteDB(dbName)
        .then(() => {
          clearTimeout(timeoutId);
          resolve();
        })
        .catch(reject);
    });
  }
  async storeRequestData(id: string, data: Data) {
    const db = await this.initializeDB();
    return db.put('requests', data, id + this.instanceId);
  }
  async getRequestData(id: string): Promise<Data> {
    const db = await this.initializeDB();
    return db.get('requests', id + this.instanceId);
  }
  async storeResponseData(id: string, data: Data) {
    const db = await this.initializeDB();
    return db.put('responses', data, id + this.instanceId);
  }
  async getResponseData(id: string): Promise<Data> {
    const db = await this.initializeDB();
    return db.get('responses', id + this.instanceId);
  }

  async closeConnection() {
    const db = await this.initializeDB();
    db.close();
    this.dbPromise = null;
    console.log(
      `[network] Closed Connection to db for instance ${this.instanceId}`,
    );
  }
  async addDataToRequest(request: Request): Promise<RequestWithData> {
    const requestData = await this.getRequestData(request.id);
    const responseData = await this.getResponseData(request.id);
    return {
      ...request,
      requestData,
      responseData,
    };
  }
}
