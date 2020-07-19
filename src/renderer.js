export class Renderer {
    constructor(context, width, height, scale = 1) {
        this._context = context;
        this._scaledBuffer = null;
        this._drawStrategy = null;

        this.width = width;
        this.height = height;
        this.scale = scale;
    }
    
    get scale() { return this.__scale; }
    set scale(newScale) { 
        this.__scale = Math.floor(newScale); 
        this._scaledBuffer = this._calculateScaledBuffer(this.scale);
        this._drawStrategy = this._createDrawStrategy(this.scale);
    }

    get width() { return this.__width; }
    set width(newWidth) { this.__width = newWidth; }

    get height() { return this.__height; }
    set height(newHeight) { this.__height = newHeight; }

    draw(buffer) {
        this._drawStrategy(buffer);
    }

    _calculateScaledBuffer(scale) {
        if (scale === 1) {
            return null;
        } else {
            return new ImageData(this.width * this.scale, this.height * this.scale);
        } 
    }

    _createDrawStrategy(scale) {
        if (scale === 1) {
            return this._drawDefault;
        } else {
            return this._drawScaled;
        }
    }

    _drawDefault(buffer) {
        this._context.putImageData(buffer, 0, 0);
    }

    _drawScaled(buffer) {
        nearestNeighborInterp(buffer, this._scaledBuffer);
        this._context.putImageData(this._scaledBuffer, 0, 0);
    }
}

// TODO: Implement with GPU.js
// Integer scaling.
function nearestNeighborInterp(src, dest) {
    const scale = Math.floor(dest.height / src.height);

    for (let row = 0; row < dest.height; row++) {
        for (let col = 0; col < dest.width; col++) {
            const srcRow = Math.floor(row / scale);
            const srcCol = Math.floor(col / scale);
            const srcPos = (srcRow * src.width + srcCol) * 4
            const destPos = (row * dest.width + col) * 4

            dest.data[destPos + 0] = src.data[srcPos + 0];  // R
            dest.data[destPos + 1] = src.data[srcPos + 1];  // G
            dest.data[destPos + 2] = src.data[srcPos + 2];  // B
            dest.data[destPos + 3] = src.data[srcPos + 3];  // A
        }
    }
}