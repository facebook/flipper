/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

// This module declaration is a stub!
// Please extend this as needed.

declare module 'adbkit-logcat-fb' {
    class Reader {
        constructor(options: any);

        connect(stream: any): any;

        end(): any;

        exclude(tag: any): any;

        excludeAll(): any;

        include(tag: any, priority: any): any;

        includeAll(priority: any): any;

        resetFilters(): any;

        static ANY: string;

        static defaultMaxListeners: number;

        static init(): void;

        static listenerCount(emitter: any, type: any): any;

        static once(emitter: any, name: any): any;

        static usingDomains: boolean;

    }

    function Priority(): void;

    function readStream(stream: any, options: any): any;

    namespace Priority {
        const DEBUG: number;

        const DEFAULT: number;

        const ERROR: number;

        const FATAL: number;

        const INFO: number;

        const SILENT: number;

        const UNKNOWN: number;

        const VERBOSE: number;

        const WARN: number;

        function fromLetter(letter: any): any;

        function fromName(name: any): any;

        function toLetter(value: any): any;

        function toName(value: any): any;

    }

    namespace Reader {
        class EventEmitter {
            constructor();

            addListener(type: any, listener: any): any;

            emit(type: any, args: any): any;

            eventNames(): any;

            getMaxListeners(): any;

            listenerCount(type: any): any;

            listeners(type: any): any;

            off(type: any, listener: any): any;

            on(type: any, listener: any): any;

            once(type: any, listener: any): any;

            prependListener(type: any, listener: any): any;

            prependOnceListener(type: any, listener: any): any;

            rawListeners(type: any): any;

            removeAllListeners(type: any, ...args: any[]): any;

            removeListener(type: any, listener: any): any;

            setMaxListeners(n: any): any;

            static EventEmitter: any;

            static defaultMaxListeners: number;

            static init(): void;

            static listenerCount(emitter: any, type: any): any;

            static once(emitter: any, name: any): any;

            static usingDomains: boolean;

        }

    }

}

