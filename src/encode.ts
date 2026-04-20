import varint from 'varint';
import { Transform, TransformCallback } from 'node:stream';

export class Encoder extends Transform {

  constructor() {
    super();
  }

  _transform(data: Buffer, enc: BufferEncoding, cb: TransformCallback): void {
    const lengthBuffer = Buffer.alloc(10);
    varint.encode(data.length, lengthBuffer, 0);

    this.push(lengthBuffer.subarray(0, varint.encode.bytes!));
    this.push(data);

    cb();
  }
}
