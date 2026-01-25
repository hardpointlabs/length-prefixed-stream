import varint from 'varint';
import { Transform, TransformCallback } from 'node:stream';

export interface DecoderOptions {
  limit: number;
  allowEmpty: boolean;
}

const defaultOptions: DecoderOptions = {
  limit: 0,
  allowEmpty: false,
}

export class Decoder extends Transform {

  private _destroyed: boolean;
  private _missing: number;
  private _message: Buffer | null;
  private _limit: number;
  private _allowEmpty: boolean;
  private _prefix: Buffer;
  private _ptr: number;

  constructor(opts: Partial<DecoderOptions> = {}) {
    const derived = { ...defaultOptions, ...opts };

    if (derived.allowEmpty) {
      super({readableHighWaterMark: 16, readableObjectMode: true});
    } else {
      super();
    }

    this._destroyed = false;
    this._missing = 0;
    this._message = null;
    this._limit = derived.limit;
    this._allowEmpty = derived.allowEmpty;
    this._prefix = Buffer.allocUnsafe(this._limit ? varint.encodingLength(this._limit) : 100);
    this._ptr = 0;
  }

  private _push(message: Buffer) {
    this._ptr = 0;
    this._missing = 0;
    this._message = null;
    this.push(message);
  }

  private _parseLength(data: Buffer, offset: number) {
    for (offset; offset < data.length; offset++) {
      if (this._ptr >= this._prefix.length) return this._prefixError(data);
      this._prefix[this._ptr++] = data[offset];
      if (!(data[offset] & 0x80)) {
        this._missing = varint.decode(this._prefix);
        if (this._limit && this._missing > this._limit) return this._prefixError(data);
        if (!this._missing && this._allowEmpty) this._push(Buffer.alloc(0));
        this._ptr = 0;
        return offset + 1;
      }
    }
    return data.length;
  }

  private _prefixError(data: Buffer) {
    this.destroy(new Error('Message is larger than max length'));
    return data.length;
  }

  private _parseMessage(data: Buffer, offset: number) {
    var free = data.length - offset;
    var missing = this._missing;

    if (!this._message) {
      if (missing <= free) { // fast track - no copy
        this._push(data.subarray(offset, offset + missing));
        return offset + missing;
      }
      this._message = Buffer.allocUnsafe(missing);
    }

    // TODO: add opt-in "partial mode" to completely avoid copys
    data.copy(this._message, this._ptr, offset, offset + missing);

    if (missing <= free) {
      this._push(this._message);
      return offset + missing;
    }

    this._missing -= free;
    this._ptr += free;

    return data.length;
  }

  _transform(data: Buffer, enc: BufferEncoding, cb: TransformCallback): void {
    var offset = 0;

    while (!this._destroyed && offset < data.length) {
      if (this._missing) offset = this._parseMessage(data, offset);
      else offset = this._parseLength(data, offset);
    }

    cb();
  }

  destroy(err?: Error): this {
    this._destroyed = true;
    if (err) this.emit('error', err);
    this.emit('close');
    return this;
  }
}
