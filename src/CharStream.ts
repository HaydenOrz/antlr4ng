/*
 * Copyright (c) The ANTLR Project. All rights reserved.
 * Use of this file is governed by the BSD 3-clause license that
 * can be found in the LICENSE.txt file in the project root.
 */

/* eslint-disable jsdoc/require-param, @typescript-eslint/naming-convention */

import { Token } from "./Token.js";
import { Interval } from "./misc/Interval.js";
import { IntStream } from "./IntStream.js";

export interface CharStream extends IntStream {
    /**
     * Reset the stream so that it's in the same state it was
     * when the object was created *except* the data array is not
     * touched.
     */
    reset(): void;
    /**
     * get a substring from the stream at start to stop (inclusive).
     *
     * @param start Start index
     * @param stop Stop index
     */
    getText(start: number, stop: number): string;
    /**
     * get a substring from the stream at specified interval (inclusive).
     *
     * @param interval
     */
    getText(interval: Interval): string;
}

export class CharStreamImpl implements CharStream {
    public name = "";
    public index = 0;

    private data: Uint32Array;

    public constructor(input: string) {
        // Convert input to UTF-32 code points.
        const codePoints: number[] = [];
        for (const char of input) {
            codePoints.push(char.codePointAt(0)!);
        }

        this.data = new Uint32Array(codePoints);
    }

    /**
     * Reset the stream so that it's in the same state it was
     * when the object was created *except* the data array is not
     * touched.
     */
    public reset(): void {
        this.index = 0;
    }

    public consume(): void {
        if (this.index >= this.data.length) {
            throw new Error("cannot consume EOF");
        }
        this.index += 1;
    }

    public LA(offset: number): number {
        if (offset === 0) {
            return 0; // undefined
        }
        if (offset < 0) {
            offset += 1; // e.g., translate LA(-1) to use offset=0
        }
        const pos = this.index + offset - 1;
        if (pos < 0 || pos >= this.data.length) { // invalid
            return Token.EOF;
        }

        return this.data[pos];
    }

    // mark/release do nothing; we have entire buffer
    public mark(): number {
        return -1;
    }

    public release(_marker: number): void {
    }

    /**
     * consume() ahead until p==_index; can't just set p=_index as we must
     * update line and column. If we seek backwards, just set p
     */
    public seek(index: number): void {
        if (index <= this.index) {
            this.index = index; // just jump; don't update stream state (line,

            // ...)
            return;
        }
        // seek forward
        this.index = Math.min(index, this.data.length);
    }

    public getText(start: number, stop: number): string;
    public getText(interval: Interval): string;
    public getText(intervalOrStart: Interval | number, stop?: number): string {
        let begin;
        let end: number;
        if (intervalOrStart instanceof Interval) {
            begin = intervalOrStart.start;
            end = intervalOrStart.stop;
        } else {
            begin = intervalOrStart;
            end = stop ?? this.data.length - 1;
        }

        if (end >= this.data.length) {
            end = this.data.length - 1;
        }

        if (begin >= this.data.length) {
            return "";
        } else {
            return this.#stringFromRange(begin, end + 1);
        }
    }

    public toString(): string {
        return this.#stringFromRange(0);
    }

    public get size(): number {
        return this.data.length;
    }

    public getSourceName(): string {
        if (this.name) {
            return this.name;
        } else {
            return IntStream.UNKNOWN_SOURCE_NAME;
        }
    }

    #stringFromRange(start: number, stop?: number): string {
        const data = this.data.slice(start, stop);
        let result = "";
        data.forEach((value) => {
            result += String.fromCodePoint(value);
        });

        return result;
    }
}
