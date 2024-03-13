
import { ZX } from './zx-bitmap.js';

export const logo = () => {
    const example = new ZX.Spectrum.Bitmap({target: new OffscreenCanvas(256, 192)});
    example.paper(7);
    example.ink(2);
    example.bright(0);
    example.cls();
    example.realSpectrumCoords(false);
    for (let x = 73; x < 93; ++x) {
        example.line(x, 0, x - 50, 191);
    }
    example.paper(2);
    example.inverse(1);
    for (let x = 93; x < 113; ++x) {
        example.line(x, 0, x - 50, 191);
    }
    example.ink(6);
    example.inverse(0);
    for (let x = 113; x < 133; ++x) {
        example.line(x, 0, x - 50, 191);
    }
    example.paper(6);
    example.inverse(1);
    for (let x = 133; x < 153; ++x) {
        example.line(x, 0, x - 50, 191);
    }
    example.ink(4);
    example.inverse(0);
    for (let x = 153; x < 173; ++x) {
        example.line(x, 0, x - 50, 191);
    }
    example.paper(4);
    example.inverse(1);
    for (let x = 173; x < 193; ++x) {
        example.line(x, 0, x - 50, 191);
    }
    example.ink(5);
    example.inverse(0);
    for (let x = 193; x < 213; ++x) {
        example.line(x, 0, x - 50, 191);
    }
    example.paper(7);
    for (let x = 213; x < 233; ++x) {
        example.line(x, 0, x - 50, 191);

    }
    return example.save();
}
