import { Encoder } from './encode.js';
import { Decoder } from './decode.js';

export type CodecPair = [encoder: Encoder, decoder: Decoder];

export { Encoder, Decoder };
