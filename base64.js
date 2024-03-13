
Uint8ClampedArray.prototype.toBase64 = function() {
    const binaryString = this.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
    return btoa(binaryString);
};

export const base64ToUint8ClampedArray = (base64) => {
    const binaryString = atob(base64);
    const bytes = new Uint8ClampedArray(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};
