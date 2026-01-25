import varint from 'varint';
import { Transform, TransformCallback } from 'node:stream';

export class Encoder extends Transform {

  private pool = Buffer.allocUnsafe(10 * 1024);
  private used = 0
  private _destroyed: boolean;

  constructor() {
    super();
    this._destroyed = false;
  }

  _transform(data: Buffer, enc: BufferEncoding, cb: TransformCallback): void {
    if (this._destroyed) return cb();

    varint.encode(data.length, this.pool, this.used);
    this.used += varint.encode.bytes!;

    this.push(this.pool.subarray(this.used - varint.encode.bytes!, this.used));
    this.push(data);

    if (this.pool.length - this.used < 100) {
      this.pool = Buffer.allocUnsafe(10 * 1024);
      this.used = 0;
    }

    cb();
  }

  destroy(err?: Error | undefined): this {
    if (this._destroyed) return this;
    this._destroyed = true;
    if (err) this.emit('error', err);
    this.emit('close');
    return this;
  }
}
