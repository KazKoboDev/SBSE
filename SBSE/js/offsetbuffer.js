function OffsetBuffer(buffer_param, read_offset, write_offset) {
    if (Buffer.isBuffer(buffer_param)) {
        this.buf = buffer_param;
    } else {
        this.buf = new Buffer(buffer_param);
    }
    this.read_offset = read_offset || 0;
    this.write_offset = write_offset || 0;
}

// Basic Buffer functionality ----------------------------

OffsetBuffer.prototype.writeUTF8Str = function(value) {
    if (value == "") {
        this.writeInt8(0x00);
        return;
    }
    var length = value.length;
    this.writeVLQU(length);
    this.write(value);
};

OffsetBuffer.prototype.writeVLQU = function(len) {
    if (len == 0) {
        this.writeInt8(0x00);
        return;
    }

    var round = 0;
    var result = new Array();
    while (len > 0) {
        result.splice(0, 0, (round > 0)?len&0x7F|0x80:len&0x7F);
        len >>= 7;
        round++;
    }
    for (var i=0;i<result.length;i++) {
        this.writeUInt8(result[i]);
    }
};

OffsetBuffer.prototype.writeVLQI = function(len) {
    var value = Math.abs(len * 2);
    if (len < 0) {
        value -= 1;
    }
    return this.writeVLQU(value);
};

OffsetBuffer.prototype.writeInt8 = function(value) {
    this.buf.writeInt8(value, this.write_offset);
    this.write_offset += 1;
};

OffsetBuffer.prototype.writeUInt8 = function(value) {
    this.buf.writeUInt8(value, this.write_offset);
    this.write_offset += 1;
};

OffsetBuffer.prototype.writeInt16BE = function(value) {
    this.buf.writeInt16BE(value, this.write_offset);
    this.write_offset += 2;
};

OffsetBuffer.prototype.writeInt16LE = function(value) {
    this.buf.writeInt16LE(value, this.write_offset);
    this.write_offset += 2;
};

OffsetBuffer.prototype.writeUInt16BE = function(value) {
    this.buf.writeUInt16BE(value, this.write_offset);
    this.write_offset += 2;
};

OffsetBuffer.prototype.writeUInt16LE = function(value) {
    this.buf.writeUInt16LE(value, this.write_offset);
    this.write_offset += 2;
};

OffsetBuffer.prototype.writeInt32BE = function(value) {
    this.buf.writeInt32BE(value, this.write_offset);
    this.write_offset += 4;
};

OffsetBuffer.prototype.writeInt32LE = function(value) {
    this.buf.writeInt32LE(value, this.write_offset);
    this.write_offset += 4;
};

OffsetBuffer.prototype.writeUInt32BE = function(value) {
    this.buf.writeUInt32BE(value, this.write_offset);
    this.write_offset += 4;
};

OffsetBuffer.prototype.writeUInt32LE = function(value) {
    this.buf.writeUInt32LE(value, this.write_offset);
    this.write_offset += 4;
};

OffsetBuffer.prototype.writeDoubleBE = function(value) {
    this.buf.writeDoubleBE(value, this.write_offset);
    this.write_offset += 8;
};

OffsetBuffer.prototype.writeDoubleLE = function(value) {
    this.buf.writeDoubleLE(value, this.write_offset);
    this.write_offset += 8;
};

OffsetBuffer.prototype.readUTF8Str = function() {
    var length = this.readVLQUValue(this.readVLQU());
    var result = this.buf.slice(this.read_offset, this.read_offset+length).toString();
    this.read_offset += length;
    return result;
};

OffsetBuffer.prototype.readVLQU = function() {
    var result = new Array();
        result[0] = this.readUInt8();
    var i = 0;
    while (result[i] > 0x7f) {
        i++;
        result[i] = this.readUInt8();
    }
    return result;
};

OffsetBuffer.prototype.readVLQI = function() {
    return this.readVLQU();
};

OffsetBuffer.prototype.readVLQUValue = function(u) {
    var i = 0;
    var result = 0;
    var cur = u[i];
    while (cur & 0x80) {
        cur = u[i++];
        result = (result << 7) | (cur & 0x7f);
    }
    if (!result) { result = u[0]; }
    return result;
};

OffsetBuffer.prototype.readVLQIValue = function(u) {
    var result = this.readVLQUValue(u);
    var newResult = result >> 1;
    if (result & 1) {
        newResult = ~newResult;
    }

    return newResult;
};

OffsetBuffer.prototype.readInt8 = function() {
    var result = this.buf.readInt8(this.read_offset);
    this.read_offset += 1;
    return result;
};

OffsetBuffer.prototype.readUInt8 = function() {
    var result = this.buf.readUInt8(this.read_offset);
    this.read_offset += 1;
    return result;
};

OffsetBuffer.prototype.readInt16BE = function() {
    var result = this.buf.readInt16BE(this.read_offset);
    this.read_offset += 2;
    return result;
};

OffsetBuffer.prototype.readInt16LE = function() {
    var result = this.buf.readInt16LE(this.read_offset);
    this.read_offset += 2;
    return result;
};

OffsetBuffer.prototype.readUInt16BE = function() {
    var result = this.buf.readUInt16BE(this.read_offset);
    this.read_offset += 2;
    return result;
};

OffsetBuffer.prototype.readUInt16LE = function() {
    var result = this.buf.readUInt16LE(this.read_offset);
    this.read_offset += 2;
    return result;
};

OffsetBuffer.prototype.readInt32BE = function() {
    var result = this.buf.readInt32BE(this.read_offset);
    this.read_offset += 4;
    return result;
};

OffsetBuffer.prototype.readInt32LE = function() {
    var result = this.buf.readInt32LE(this.read_offset);
    this.read_offset += 4;
    return result;
};

OffsetBuffer.prototype.readUInt32BE = function() {
    var result = this.buf.readUInt32BE(this.read_offset);
    this.read_offset += 4;
    return result;
};

OffsetBuffer.prototype.readUInt32LE = function() {
    var result = this.buf.readUInt32LE(this.read_offset);
    this.read_offset += 4;
    return result;
};

OffsetBuffer.prototype.readDoubleBE = function() {
    var result = this.buf.readDoubleBE(this.read_offset);
    this.read_offset += 8;
    return result;
};

OffsetBuffer.prototype.readDoubleLE = function() {
    var result = this.buf.readDoubleLE(this.read_offset);
    this.read_offset += 8;
    return result;
};

OffsetBuffer.prototype.fill = function(value, end) {
    end = end || this.buf.length;
    this.buf.fill(value, this.write_offset, end);
    this.write_offset = end;
};

OffsetBuffer.prototype.write = function(str, encoding) {
    encoding = encoding || 'utf8';
    this.buf.write(str, this.write_offset, str.length, encoding);
    this.write_offset += str.length;
};

OffsetBuffer.prototype.toString2 = function() {
    var buf = '[';
    buf += 'buffer: ' + this.buf.toString('hex');
    buf += ', read_offset: ' + this.read_offset;
    buf += ', write_offset: ' + this.write_offset;
    buf += ']';
    return buf;
};

OffsetBuffer.prototype.toString = function(val) {
    return this.buf.toString(val);
};

// Convenience copy methods ----------------------------------

OffsetBuffer.prototype.copyFrom = function(source, start, end) {
    start = start || 0;
    end = end || source.length;
    source.copy(this.buf, this.write_offset, start, end);
    this.write_offset += end - start;
};

OffsetBuffer.prototype.copyTo = function(buffer) {
    this.buf.copy(buffer, 0, this.read_offset, this.read_offset + buffer.length);
    this.read_offset += buffer.length;
};