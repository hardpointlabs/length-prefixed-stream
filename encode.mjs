import varint from 'varint';
import stream from 'node:stream';

var pool = Buffer.allocUnsafe(10 * 1024)
var used = 0

export default class Encoder extends stream.Transform {
  constructor() {
    super();
    stream.Transform.call(this);
    this._destroyed = false;
  }
  _transform(data, enc, cb) {
    if (this._destroyed) return cb();

    varint.encode(data.length, pool, used);
    used += varint.encode.bytes;

    this.push(pool.slice(used - varint.encode.bytes, used));
    this.push(data);

    if (pool.length - used < 100) {
      pool = Buffer.allocUnsafe(10 * 1024);
      used = 0;
    }

    cb();
  }
  destroy(err) {
    if (this._destroyed) return;
    this._destroyed = true;
    if (err) this.emit('error', err);
    this.emit('close');
  }
}
