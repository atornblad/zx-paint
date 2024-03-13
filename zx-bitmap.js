
import { base64ToUint8ClampedArray } from './base64.js';

const DEBUGOUTPUT = false;

const WIDTH = 256;
const HEIGHT = 192;
const BLOCKWIDTH = (WIDTH >> 3);
const BLOCKHEIGHT = (HEIGHT >> 3);

const ATTROFFSET = BLOCKWIDTH * HEIGHT;
const TOTALSIZE = BLOCKWIDTH * HEIGHT + BLOCKWIDTH * BLOCKHEIGHT;

/*

Address: (x = pixel)
y7  y6 y2 y1 y0  y5 y4 y3 x7  x6 x5 x4 x3
y: 0..191
x: 0..255

Address: (x = block)
y7  y6 y2 y1 y0  y5 y4 y3 x4  x3 x2 x1 x0
y: 0..191
x: 0..31

Address: (x = block, y = block)
y4  y3  0  0  0  y2 y1 y0 x4  x3 x2 x1 x0
y: 0..23
x: 0..31

Block index : x + (y / 8) * 32    = x + (y & 0xfe0) * 4:
                y7 y6 y5 y4 y3 x4 x3 x2 x1 x0
                Address & 0xff   |    (Address & 0x1800 >> 3)

*/

const blockIndexFromOffset = (offset) => {
    if (offset < 0 || offset >= ATTROFFSET) return -1;
    return (offset & 0x00ff) | ((offset & 0x1800) >> 3);
}

const getPointInfo = (x, y, realSpectrumCoords) => {
    x = Math.round(x) & 255;
    if (realSpectrumCoords) {
        y = 175 - y;
    }
    y = Math.round(y) & 255;
    
    if (y > 191) return null;
    
    var xBlock = x >> 3;
    var yBlock = y >> 3;
    
    return {
        "x" : x,
        "y" : y,
        "blockX" : xBlock,
        "blockY" : yBlock,
        "attrIndex" : 6144 + (xBlock | (yBlock << 5)),
        "bitmapIndex" : xBlock | ((y & 0x0007) << 8) | ((y & 0x0038) << 2) | ((y & 0x00c0) << 5),
        "attrAddress" : 16384 + 6144 + (xBlock | (yBlock << 5)),
        "bitmapAddress" : 16384 + (xBlock | ((y & 0x0007) << 8) | ((y & 0x0038) << 2) | ((y & 0x00c0) << 5)),
        "bit" : 0x80 >> (x & 7)
    };
};

const $defaults = (provided, defaults) => {
    var output = {};
    
    for (var key in defaults) {
        if (provided && key in provided) {
            output[key] = provided[key];
        } else {
            output[key] = defaults[key];
        }
    }
    
    return output;
};

const colorTable = [0, 0, 0, 0, 0, 192, 192, 0, 0, 192, 0, 192, 0, 192, 0, 0, 192, 192, 192, 192, 0, 192, 192, 192, 
                    0, 0, 0, 0, 0, 255, 255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255, 255, 255];

const ZX = {};

const Spectrum = ZX['Spectrum'] = {};

const Bitmap = Spectrum['Bitmap'] = function Bitmap(options) {
    let i;
    
    const opts = $defaults(options, {
        "target" : null,
        "clear": false
    });
    
    const data = new Uint8ClampedArray(TOTALSIZE);
    
    if ('clear' in opts && opts['clear'] !== false) {
        for (i = 0; i < TOTALSIZE; ++i) {
            data[i] = opts['clear'];
        }
    } else {
        for (i = 0; i < TOTALSIZE; ++i) {
            data[i] = (Math.random() * 256) & 0xff;
        }
    }
    
    let dirty = new Uint8Array(BLOCKWIDTH * BLOCKHEIGHT);
    let hasDirt = true;
    let dirtMinBlock = 0;
    let dirtMaxBlock = ATTROFFSET - 1;
    
    for (i = 0; i < BLOCKWIDTH * BLOCKHEIGHT; ++i) dirty[i] = true;
    
    const dataProxy = this['data'] = new Proxy(data, {
        "set" : function(target, property, value, receiver) {
            if (property >= 0 && property < TOTALSIZE) {
                data[property] = value;
                
                var dirtIndex;
                
                if (property >= ATTROFFSET) {
                    // the index is inside the color attribute part
                    dirtIndex = property - ATTROFFSET;
                } else {
                    // the index is inside the bitmap part
                    dirtIndex = blockIndexFromOffset(property);
                }
                
                dirty[dirtIndex] = 1;
                if (dirtIndex < dirtMinBlock) dirtMinBlock = dirtIndex;
                if (dirtIndex > dirtMaxBlock) dirtMaxBlock = dirtIndex;
                
                hasDirt = true;
                
                return true;
            }
            
            // Not a numeric index inside the boundaries
            return false;
        }
    });
    
    let canvas;
    
    if (opts.target) {
        canvas = opts.target;
        canvas.width = 256;
        canvas.height = 192;
    } else {
        canvas = document.createElement('CANVAS');
        canvas.width = 256;
        canvas.height = 192;
        document.body.appendChild(canvas);
    }
    
    const context = canvas.getContext('2d');
    const imageData = context.getImageData(0, 0, 256, 192);
    
    let flashPhase = 0;
    let lastFlashPhase = 0;
    
    const refreshFunc = function() {
        flashPhase = (flashPhase + 1) & 0x3f;
        const flashChange = (flashPhase ^ lastFlashPhase) & 0x20;
        lastFlashPhase = flashPhase;
        if (!(hasDirt || flashChange)) return;
        
        if (flashChange) {
            dirtMinBlock = 0;
            dirtMaxBlock = BLOCKWIDTH * BLOCKHEIGHT;
        }
        
        const targetData = imageData.data;
        
        for (let dirtIndex = dirtMinBlock; dirtIndex <= dirtMaxBlock; ++dirtIndex) {
            const attributeByte = data[dirtIndex + ATTROFFSET];
            const flash = (attributeByte & 0x80);
            if (!(flashChange && flash || (hasDirt && dirty[dirtIndex]))) continue;
            
            dirty[dirtIndex] = 0;
            
            const xBlockIndex = (dirtIndex & 0x1f);
            const xLeft = (xBlockIndex << 3);
            const yBlockIndexNotShifted = (dirtIndex & 0x1fe0);
            const yBlockIndexShifted = (yBlockIndexNotShifted >> 5);
            const yTop = (yBlockIndexShifted << 3);
/*
Address: (x = block, y = block)
y4  y3  0  0  0  y2 y1 y0 x4  x3 x2 x1 x0
y: 0..23
x: 0..31
*/                
            const offsetFirst = xBlockIndex | (yBlockIndexNotShifted & 0x00e0) | ((yBlockIndexNotShifted & 0x0300) << 3);
            
            let ink = (attributeByte & 0x07) | ((attributeByte & 0x40) >> 3);
            let paper = (attributeByte & 0x78) >> 3;
            if (flash && (flashPhase & 0x20)) {
                [ink, paper] = [paper, ink];
            }
            
            for (var yPixelOffset = 0; yPixelOffset < 8; ++yPixelOffset) {
                const bitmapByte = data[offsetFirst | (yPixelOffset << 8)];
                let imageDataOffset = ((yTop + yPixelOffset) * 256 + xLeft) * 4;
                
                for (var xPixelOffset = 0; xPixelOffset < 8; ++xPixelOffset) {
                    const colorIndex = (bitmapByte & (0x80 >> xPixelOffset)) ? ink : paper;
                    targetData[imageDataOffset++] = colorTable[colorIndex * 3];
                    targetData[imageDataOffset++] = colorTable[colorIndex * 3 + 1];
                    targetData[imageDataOffset++] = colorTable[colorIndex * 3 + 2];
                    targetData[imageDataOffset++] = 255;
                }
            }
        }
        
        context.putImageData(imageData, 0, 0);
        
        hasDirt = false;
        dirtMinBlock = ATTROFFSET - 1;
        dirtMaxBlock = 0;
        if (flashChange && this['onFlashChange']) {
            this['onFlashChange']();
        }
    };
    
    this['refresh'] = refreshFunc.bind(this);
    const current = this;
    
    if (!opts['defer']) {
        let func;
        
        if (DEBUGOUTPUT) {
            let maxTime = 0.0;
            let totalTime = 0.0;
            let ticks = 0;
            let nextTimeOutput = Date.now();
            let nextFrame = null;
            
            func = function(time) {
                if (time) {
                    if (nextFrame) {
                        if (time < nextFrame) {
                            window.requestAnimationFrame(func);
                            return;
                        }
                        nextFrame += 20;
                    }
                    else {
                        nextFrame = time + 20;
                    }
                }
                const started = performance.now();
                refreshFunc.call(current);
                const ended = performance.now();
                const timeTaken = ended - started;
                totalTime += timeTaken;
                ++ticks;
                if (timeTaken > maxTime && ticks > 2) maxTime = timeTaken; 
                const now = Date.now();
                if (now > nextTimeOutput) {
                    console.log("Max time taken: " + maxTime.toFixed(1) + ", average time taken: " + (totalTime / ticks).toFixed(1));
                    maxTime = 0.0;
                    totalTime = 0.0;
                    ticks = 0;
                    nextTimeOutput += 5000;
                }
                window.requestAnimationFrame(func);
            };
        } else {
            let nextFrame = null;
            func = function(time) {
                if (time) {
                    if (nextFrame) {
                        if (time < nextFrame) {
                            window.requestAnimationFrame(func);
                            return;
                        }
                        nextFrame += 20;
                    }
                    else {
                        nextFrame = time + 20;
                    }
                }
                refreshFunc.call(current);
                window.requestAnimationFrame(func);
            }
        }
        func();
    }
    
    let currentInk = 0;
    let currentPaper = 7;
    let currentBright = 0;
    let currentFlash = 0;
    let currentOver = 0;
    let currentInverse = 0;
    let currentAttrValue = 56;
    let lastPlotX = 0;
    let lastPlotY = 0;
    let realSpectrumCoords = true;
    
    this['realSpectrumCoords'] = function(value) {
        realSpectrumCoords = value ? 1 : 0;
    };

    this['load'] = function(data) {
        const temp = base64ToUint8ClampedArray(data);
        for (var i = 0; i < TOTALSIZE && i < temp.length; ++i) {
            dataProxy[i] = temp[i];
        }
    };

    this['save'] = function() {
        return data.toBase64();
    }
    
    this['poke'] = function(address, value) {
        dataProxy[(address - 16384) & 0x1fff] = value & 255;
    };
    
    this['peek'] = function(address) {
        if (address < 16384 || address >= 16384 + TOTALSIZE) return 0;
        return data[(address - 16384) & 0x1fff];
    };
    
    this['ink'] = function(i) {
        currentInk = i & 7;
        currentAttrValue = currentAttrValue & 0xf8 | currentInk;
    };
    
    this['paper'] = function(p) {
        currentPaper = p;
        if (p <= 7) currentAttrValue = currentAttrValue & 0xc7 | (currentPaper << 3)
    };
    
    this['bright'] = function(b) {
        currentBright = b ? 1 : 0;
        currentAttrValue = currentAttrValue & 0xbf | (currentBright << 6);
    };
    
    this['inverse'] = function(i) {
        currentInverse = i ? 1 : 0;
    };
    
    this['over'] = function(o) {
        currentOver = o ? 1 : 0;
    };
    
    this['flash'] = function(f) {
        currentFlash = f ? 1 : 0;
        currentAttrValue = currentAttrValue & 0x7f | (currentFlash << 7);
    };
    
    this['plot'] = function(x, y) {
        var pointInfo = getPointInfo(x, y, realSpectrumCoords);
        if (!pointInfo) return;
        
        if (currentPaper <= 7)
            dataProxy[pointInfo.attrIndex] = currentAttrValue;
        else if (currentPaper == 8)
            dataProxy[pointInfo.attrIndex] = (dataProxy[pointInfo.attrIndex] & 0x38) | (currentAttrValue & 0xc7);

        if (currentOver) {
            dataProxy[pointInfo.bitmapIndex] ^= pointInfo.bit;
        } else if (currentInverse) {
            dataProxy[pointInfo.bitmapIndex] &= (255 - pointInfo.bit);
        } else {
            dataProxy[pointInfo.bitmapIndex] |= pointInfo.bit;
        }
        
        lastPlotX = x;
        lastPlotY = y;
    };
    
    this['line'] = function(x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        
        if (dx == 0 && dy == 0) {
            this['plot'](x1, y1);
            return;
        }
        
        var x, y;
        if (Math.abs(dx) > Math.abs(dy)) {
            // dx is bigger - go from x1 to x2 or from x2 to x1
            var xstart = dx > 0 ? x1 : x2;
            var xstop = x1 + x2 - xstart;
            
            for (x = xstart; x <= xstop; ++x) {
                y = (x - x1) / (x2 - x1) * (y2 - y1) + y1;
                this['plot'](Math.round(x), Math.round(y));
            }
        } else {
            // dy is bigger - go from y1 to y2 or from y2 to y1
            var ystart = dy > 0 ? y1 : y2;
            var ystop = y1 + y2 - ystart;
            
            for (y = ystart; y <= ystop; ++y) {
                x = (y - y1) / (y2 - y1) * (x2 - x1) + x1;
                this['plot'](Math.round(x), Math.round(y));
            }
        }
        
        lastPlotX = x2;
        lastPlotY = y2;
    };
    
    this['draw'] = function(x, y) {
        this['line'](lastPlotX, lastPlotY, lastPlotX + x, lastPlotY + y);
    };
    
    this['cls'] = function() {
        var i = 0;
        while (i < ATTROFFSET) {
            dataProxy[i++] = 0;
        }
        while (i < TOTALSIZE) {
            dataProxy[i++] = currentAttrValue;
        }
        
        dirtMinBlock = 0;
        dirtMaxBlock = BLOCKWIDTH * BLOCKHEIGHT;
        hasDirt = true;
    };
    
    Spectrum['currentBitmap'] = this;
};

Bitmap['getPointInfo'] = getPointInfo;

export { ZX };
