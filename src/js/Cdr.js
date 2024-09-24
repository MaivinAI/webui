var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
    return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
function createCommonjsModule(fn, basedir, module) {
    return module = {
        path: basedir,
        exports: {},
        require: function (path, base) {
            return commonjsRequire(path, base === void 0 || base === null ? module.path : base);
        }
    }, fn(module, module.exports), module.exports;
}
function commonjsRequire() {
    throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs");
}
var EncapsulationKind_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EncapsulationKind = void 0;
    (function (EncapsulationKind2) {
        EncapsulationKind2[EncapsulationKind2["CDR_BE"] = 0] = "CDR_BE";
        EncapsulationKind2[EncapsulationKind2["CDR_LE"] = 1] = "CDR_LE";
        EncapsulationKind2[EncapsulationKind2["PL_CDR_BE"] = 2] = "PL_CDR_BE";
        EncapsulationKind2[EncapsulationKind2["PL_CDR_LE"] = 3] = "PL_CDR_LE";
        EncapsulationKind2[EncapsulationKind2["CDR2_BE"] = 16] = "CDR2_BE";
        EncapsulationKind2[EncapsulationKind2["CDR2_LE"] = 17] = "CDR2_LE";
        EncapsulationKind2[EncapsulationKind2["PL_CDR2_BE"] = 18] = "PL_CDR2_BE";
        EncapsulationKind2[EncapsulationKind2["PL_CDR2_LE"] = 19] = "PL_CDR2_LE";
        EncapsulationKind2[EncapsulationKind2["DELIMITED_CDR2_BE"] = 20] = "DELIMITED_CDR2_BE";
        EncapsulationKind2[EncapsulationKind2["DELIMITED_CDR2_LE"] = 21] = "DELIMITED_CDR2_LE";
        EncapsulationKind2[EncapsulationKind2["RTPS_CDR2_BE"] = 6] = "RTPS_CDR2_BE";
        EncapsulationKind2[EncapsulationKind2["RTPS_CDR2_LE"] = 7] = "RTPS_CDR2_LE";
        EncapsulationKind2[EncapsulationKind2["RTPS_DELIMITED_CDR2_BE"] = 8] = "RTPS_DELIMITED_CDR2_BE";
        EncapsulationKind2[EncapsulationKind2["RTPS_DELIMITED_CDR2_LE"] = 9] = "RTPS_DELIMITED_CDR2_LE";
        EncapsulationKind2[EncapsulationKind2["RTPS_PL_CDR2_BE"] = 10] = "RTPS_PL_CDR2_BE";
        EncapsulationKind2[EncapsulationKind2["RTPS_PL_CDR2_LE"] = 11] = "RTPS_PL_CDR2_LE";
    })(exports.EncapsulationKind || (exports.EncapsulationKind = {}));
});
var getEncapsulationKindInfo_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getEncapsulationKindInfo = void 0;
    const getEncapsulationKindInfo = (kind) => {
        const isCDR2 = kind > EncapsulationKind_1.EncapsulationKind.PL_CDR_LE;
        const littleEndian = kind === EncapsulationKind_1.EncapsulationKind.CDR_LE || kind === EncapsulationKind_1.EncapsulationKind.PL_CDR_LE || kind === EncapsulationKind_1.EncapsulationKind.CDR2_LE || kind === EncapsulationKind_1.EncapsulationKind.PL_CDR2_LE || kind === EncapsulationKind_1.EncapsulationKind.DELIMITED_CDR2_LE || kind === EncapsulationKind_1.EncapsulationKind.RTPS_CDR2_LE || kind === EncapsulationKind_1.EncapsulationKind.RTPS_PL_CDR2_LE || kind === EncapsulationKind_1.EncapsulationKind.RTPS_DELIMITED_CDR2_LE;
        const isDelimitedCDR2 = kind === EncapsulationKind_1.EncapsulationKind.DELIMITED_CDR2_BE || kind === EncapsulationKind_1.EncapsulationKind.DELIMITED_CDR2_LE || kind === EncapsulationKind_1.EncapsulationKind.RTPS_DELIMITED_CDR2_BE || kind === EncapsulationKind_1.EncapsulationKind.RTPS_DELIMITED_CDR2_LE;
        const isPLCDR2 = kind === EncapsulationKind_1.EncapsulationKind.PL_CDR2_BE || kind === EncapsulationKind_1.EncapsulationKind.PL_CDR2_LE || kind === EncapsulationKind_1.EncapsulationKind.RTPS_PL_CDR2_BE || kind === EncapsulationKind_1.EncapsulationKind.RTPS_PL_CDR2_LE;
        const isPLCDR1 = kind === EncapsulationKind_1.EncapsulationKind.PL_CDR_BE || kind === EncapsulationKind_1.EncapsulationKind.PL_CDR_LE;
        const usesDelimiterHeader = isDelimitedCDR2 || isPLCDR2;
        const usesMemberHeader = isPLCDR2 || isPLCDR1;
        return {
            isCDR2,
            littleEndian,
            usesDelimiterHeader,
            usesMemberHeader
        };
    };
    exports.getEncapsulationKindInfo = getEncapsulationKindInfo;
});
var isBigEndian_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isBigEndian = void 0;
    const endianTestArray = new Uint8Array(4);
    const endianTestView = new Uint32Array(endianTestArray.buffer);
    endianTestView[0] = 1;
    function isBigEndian() {
        return endianTestArray[3] === 1;
    }
    exports.isBigEndian = isBigEndian;
});
var lengthCodes = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.lengthCodeToObjectSizes = exports.getLengthCodeForObjectSize = void 0;
    function getLengthCodeForObjectSize(objectSize) {
        let defaultLengthCode;
        switch (objectSize) {
            case 1:
                defaultLengthCode = 0;
                break;
            case 2:
                defaultLengthCode = 1;
                break;
            case 4:
                defaultLengthCode = 2;
                break;
            case 8:
                defaultLengthCode = 3;
                break;
        }
        if (defaultLengthCode == void 0) {
            if (objectSize > 4294967295) {
                throw Error(`Object size ${objectSize} for EMHEADER too large without specifying length code. Max size is ${4294967295}`);
            }
            defaultLengthCode = 4;
        }
        return defaultLengthCode;
    }
    exports.getLengthCodeForObjectSize = getLengthCodeForObjectSize;
    exports.lengthCodeToObjectSizes = {
        0: 1,
        1: 2,
        2: 4,
        3: 8
    };
});
var reservedPIDs = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SENTINEL_PID = exports.EXTENDED_PID = void 0;
    exports.EXTENDED_PID = 16129;
    exports.SENTINEL_PID = 16130;
});
var CdrReader_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CdrReader = void 0;
    const textDecoder = new TextDecoder("utf8");
    class CdrReader2 {
        constructor(data) {
            this.origin = 0;
            if (data.byteLength < 4) {
                throw new Error(`Invalid CDR data size ${data.byteLength}, must contain at least a 4-byte header`);
            }
            this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
            const kind = this.kind;
            const { isCDR2, littleEndian, usesDelimiterHeader, usesMemberHeader } = (0, getEncapsulationKindInfo_1.getEncapsulationKindInfo)(kind);
            this.usesDelimiterHeader = usesDelimiterHeader;
            this.usesMemberHeader = usesMemberHeader;
            this.littleEndian = littleEndian;
            this.hostLittleEndian = !(0, isBigEndian_1.isBigEndian)();
            this.isCDR2 = isCDR2;
            this.eightByteAlignment = isCDR2 ? 4 : 8;
            this.origin = 4;
            this.offset = 4;
        }
        get kind() {
            return this.view.getUint8(1);
        }
        get decodedBytes() {
            return this.offset;
        }
        get byteLength() {
            return this.view.byteLength;
        }
        int8() {
            const value = this.view.getInt8(this.offset);
            this.offset += 1;
            return value;
        }
        uint8() {
            const value = this.view.getUint8(this.offset);
            this.offset += 1;
            return value;
        }
        int16() {
            this.align(2);
            const value = this.view.getInt16(this.offset, this.littleEndian);
            this.offset += 2;
            return value;
        }
        uint16() {
            this.align(2);
            const value = this.view.getUint16(this.offset, this.littleEndian);
            this.offset += 2;
            return value;
        }
        int32() {
            this.align(4);
            const value = this.view.getInt32(this.offset, this.littleEndian);
            this.offset += 4;
            return value;
        }
        uint32() {
            this.align(4);
            const value = this.view.getUint32(this.offset, this.littleEndian);
            this.offset += 4;
            return value;
        }
        int64() {
            this.align(this.eightByteAlignment);
            const value = this.view.getBigInt64(this.offset, this.littleEndian);
            this.offset += 8;
            return value;
        }
        uint64() {
            this.align(this.eightByteAlignment);
            const value = this.view.getBigUint64(this.offset, this.littleEndian);
            this.offset += 8;
            return value;
        }
        uint16BE() {
            this.align(2);
            const value = this.view.getUint16(this.offset, false);
            this.offset += 2;
            return value;
        }
        uint32BE() {
            this.align(4);
            const value = this.view.getUint32(this.offset, false);
            this.offset += 4;
            return value;
        }
        uint64BE() {
            this.align(this.eightByteAlignment);
            const value = this.view.getBigUint64(this.offset, false);
            this.offset += 8;
            return value;
        }
        float32() {
            this.align(4);
            const value = this.view.getFloat32(this.offset, this.littleEndian);
            this.offset += 4;
            return value;
        }
        float64() {
            this.align(this.eightByteAlignment);
            const value = this.view.getFloat64(this.offset, this.littleEndian);
            this.offset += 8;
            return value;
        }
        string(prereadLength) {
            const length = prereadLength != null ? prereadLength : this.uint32();
            if (length <= 1) {
                this.offset += length;
                return "";
            }
            const data = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, length - 1);
            const value = textDecoder.decode(data);
            this.offset += length;
            return value;
        }
        dHeader() {
            const header = this.uint32();
            return header;
        }
        emHeader() {
            if (this.isCDR2) {
                return this.memberHeaderV2();
            } else {
                return this.memberHeaderV1();
            }
        }
        memberHeaderV1() {
            this.align(4);
            const idHeader = this.uint16();
            const mustUnderstandFlag = (idHeader & 16384) >> 14 === 1;
            const implementationSpecificFlag = (idHeader & 32768) >> 15 === 1;
            const extendedPIDFlag = (idHeader & 16383) === reservedPIDs.EXTENDED_PID;
            const sentinelPIDFlag = (idHeader & 16383) === reservedPIDs.SENTINEL_PID;
            if (sentinelPIDFlag) {
                return { id: reservedPIDs.SENTINEL_PID, objectSize: 0, mustUnderstand: false, readSentinelHeader: true };
            }
            const usesReservedParameterId = (idHeader & 16383) > reservedPIDs.SENTINEL_PID;
            if (usesReservedParameterId || implementationSpecificFlag) {
                throw new Error(`Unsupported parameter ID header ${idHeader.toString(16)}`);
            }
            if (extendedPIDFlag) {
                this.uint16();
            }
            const id = extendedPIDFlag ? this.uint32() : idHeader & 16383;
            const objectSize = extendedPIDFlag ? this.uint32() : this.uint16();
            this.resetOrigin();
            return { id, objectSize, mustUnderstand: mustUnderstandFlag };
        }
        resetOrigin() {
            this.origin = this.offset;
        }
        sentinelHeader() {
            if (!this.isCDR2) {
                this.align(4);
                const header = this.uint16();
                const sentinelPIDFlag = (header & 16383) === reservedPIDs.SENTINEL_PID;
                if (!sentinelPIDFlag) {
                    throw Error(`Expected SENTINEL_PID (${reservedPIDs.SENTINEL_PID.toString(16)}) flag, but got ${header.toString(16)}`);
                }
                this.uint16();
            }
        }
        memberHeaderV2() {
            const header = this.uint32();
            const mustUnderstand = Math.abs((header & 2147483648) >> 31) === 1;
            const lengthCode = (header & 1879048192) >> 28;
            const id = header & 268435455;
            const objectSize = this.emHeaderObjectSize(lengthCode);
            return { mustUnderstand, id, objectSize, lengthCode };
        }
        emHeaderObjectSize(lengthCode) {
            switch (lengthCode) {
                case 0:
                case 1:
                case 2:
                case 3:
                    return lengthCodes.lengthCodeToObjectSizes[lengthCode];
                case 4:
                case 5:
                    return this.uint32();
                case 6:
                    return 4 * this.uint32();
                case 7:
                    return 8 * this.uint32();
                default:
                    throw new Error(`Invalid length code ${lengthCode} in EMHEADER at offset ${this.offset - 4}`);
            }
        }
        sequenceLength() {
            return this.uint32();
        }
        int8Array(count = this.sequenceLength()) {
            const array = new Int8Array(this.view.buffer, this.view.byteOffset + this.offset, count);
            this.offset += count;
            return array;
        }
        uint8Array(count = this.sequenceLength()) {
            const array = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, count);
            this.offset += count;
            return array;
        }
        int16Array(count = this.sequenceLength()) {
            return this.typedArray(Int16Array, "getInt16", count);
        }
        uint16Array(count = this.sequenceLength()) {
            return this.typedArray(Uint16Array, "getUint16", count);
        }
        int32Array(count = this.sequenceLength()) {
            return this.typedArray(Int32Array, "getInt32", count);
        }
        uint32Array(count = this.sequenceLength()) {
            return this.typedArray(Uint32Array, "getUint32", count);
        }
        int64Array(count = this.sequenceLength()) {
            return this.typedArray(BigInt64Array, "getBigInt64", count, this.eightByteAlignment);
        }
        uint64Array(count = this.sequenceLength()) {
            return this.typedArray(BigUint64Array, "getBigUint64", count, this.eightByteAlignment);
        }
        float32Array(count = this.sequenceLength()) {
            return this.typedArray(Float32Array, "getFloat32", count);
        }
        float64Array(count = this.sequenceLength()) {
            return this.typedArray(Float64Array, "getFloat64", count, this.eightByteAlignment);
        }
        stringArray(count = this.sequenceLength()) {
            const output = [];
            for (let i = 0; i < count; i++) {
                output.push(this.string());
            }
            return output;
        }
        seek(relativeOffset) {
            const newOffset = this.offset + relativeOffset;
            if (newOffset < 4 || newOffset >= this.view.byteLength) {
                throw new Error(`seek(${relativeOffset}) failed, ${newOffset} is outside the data range`);
            }
            this.offset = newOffset;
        }
        seekTo(offset) {
            if (offset < 4 || offset >= this.view.byteLength) {
                throw new Error(`seekTo(${offset}) failed, value is outside the data range`);
            }
            this.offset = offset;
        }
        align(size) {
            const alignment = (this.offset - this.origin) % size;
            if (alignment > 0) {
                this.offset += size - alignment;
            }
        }
        typedArray(TypedArrayConstructor, getter, count, alignment = TypedArrayConstructor.BYTES_PER_ELEMENT) {
            if (count === 0) {
                return new TypedArrayConstructor();
            }
            this.align(alignment);
            const totalOffset = this.view.byteOffset + this.offset;
            if (this.littleEndian !== this.hostLittleEndian) {
                return this.typedArraySlow(TypedArrayConstructor, getter, count);
            } else if (totalOffset % TypedArrayConstructor.BYTES_PER_ELEMENT === 0) {
                const array = new TypedArrayConstructor(this.view.buffer, totalOffset, count);
                this.offset += TypedArrayConstructor.BYTES_PER_ELEMENT * count;
                return array;
            } else {
                return this.typedArrayUnaligned(TypedArrayConstructor, getter, count);
            }
        }
        typedArrayUnaligned(TypedArrayConstructor, getter, count) {
            if (count < 10) {
                return this.typedArraySlow(TypedArrayConstructor, getter, count);
            }
            const byteLength = TypedArrayConstructor.BYTES_PER_ELEMENT * count;
            const copy = new Uint8Array(byteLength);
            copy.set(new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, byteLength));
            this.offset += byteLength;
            return new TypedArrayConstructor(copy.buffer, copy.byteOffset, count);
        }
        typedArraySlow(TypedArrayConstructor, getter, count) {
            const array = new TypedArrayConstructor(count);
            let offset = this.offset;
            for (let i = 0; i < count; i++) {
                array[i] = this.view[getter](offset, this.littleEndian);
                offset += TypedArrayConstructor.BYTES_PER_ELEMENT;
            }
            this.offset = offset;
            return array;
        }
    }
    exports.CdrReader = CdrReader2;
});
var CdrSizeCalculator_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CdrSizeCalculator = void 0;
    class CdrSizeCalculator2 {
        constructor() {
            this.offset = 4;
        }
        get size() {
            return this.offset;
        }
        int8() {
            return this.incrementAndReturn(1);
        }
        uint8() {
            return this.incrementAndReturn(1);
        }
        int16() {
            return this.incrementAndReturn(2);
        }
        uint16() {
            return this.incrementAndReturn(2);
        }
        int32() {
            return this.incrementAndReturn(4);
        }
        uint32() {
            return this.incrementAndReturn(4);
        }
        int64() {
            return this.incrementAndReturn(8);
        }
        uint64() {
            return this.incrementAndReturn(8);
        }
        float32() {
            return this.incrementAndReturn(4);
        }
        float64() {
            return this.incrementAndReturn(8);
        }
        string(length) {
            this.uint32();
            this.offset += length + 1;
            return this.offset;
        }
        sequenceLength() {
            return this.uint32();
        }
        incrementAndReturn(byteCount) {
            const alignment = (this.offset - 4) % byteCount;
            if (alignment > 0) {
                this.offset += byteCount - alignment;
            }
            this.offset += byteCount;
            return this.offset;
        }
    }
    exports.CdrSizeCalculator = CdrSizeCalculator2;
});
var CdrWriter_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CdrWriter = void 0;
    const textEncoder = new TextEncoder();
    class CdrWriter2 {
        constructor(options = {}) {
            var _a;
            if (options.buffer != void 0) {
                this.buffer = options.buffer;
            } else if (options.size != void 0) {
                this.buffer = new ArrayBuffer(options.size);
            } else {
                this.buffer = new ArrayBuffer(CdrWriter2.DEFAULT_CAPACITY);
            }
            const kind = (_a = options.kind) != null ? _a : EncapsulationKind_1.EncapsulationKind.CDR_LE;
            const { isCDR2, littleEndian } = (0, getEncapsulationKindInfo_1.getEncapsulationKindInfo)(kind);
            this.isCDR2 = isCDR2;
            this.littleEndian = littleEndian;
            this.hostLittleEndian = !(0, isBigEndian_1.isBigEndian)();
            this.eightByteAlignment = isCDR2 ? 4 : 8;
            this.array = new Uint8Array(this.buffer);
            this.view = new DataView(this.buffer);
            this.resizeIfNeeded(4);
            this.view.setUint8(0, 0);
            this.view.setUint8(1, kind);
            this.view.setUint16(2, 0, false);
            this.offset = 4;
            this.origin = 4;
        }
        get data() {
            return new Uint8Array(this.buffer, 0, this.offset);
        }
        get size() {
            return this.offset;
        }
        get kind() {
            return this.view.getUint8(1);
        }
        int8(value) {
            this.resizeIfNeeded(1);
            this.view.setInt8(this.offset, value);
            this.offset += 1;
            return this;
        }
        uint8(value) {
            this.resizeIfNeeded(1);
            this.view.setUint8(this.offset, value);
            this.offset += 1;
            return this;
        }
        int16(value) {
            this.align(2);
            this.view.setInt16(this.offset, value, this.littleEndian);
            this.offset += 2;
            return this;
        }
        uint16(value) {
            this.align(2);
            this.view.setUint16(this.offset, value, this.littleEndian);
            this.offset += 2;
            return this;
        }
        int32(value) {
            this.align(4);
            this.view.setInt32(this.offset, value, this.littleEndian);
            this.offset += 4;
            return this;
        }
        uint32(value) {
            this.align(4);
            this.view.setUint32(this.offset, value, this.littleEndian);
            this.offset += 4;
            return this;
        }
        int64(value) {
            this.align(this.eightByteAlignment, 8);
            this.view.setBigInt64(this.offset, value, this.littleEndian);
            this.offset += 8;
            return this;
        }
        uint64(value) {
            this.align(this.eightByteAlignment, 8);
            this.view.setBigUint64(this.offset, value, this.littleEndian);
            this.offset += 8;
            return this;
        }
        uint16BE(value) {
            this.align(2);
            this.view.setUint16(this.offset, value, false);
            this.offset += 2;
            return this;
        }
        uint32BE(value) {
            this.align(4);
            this.view.setUint32(this.offset, value, false);
            this.offset += 4;
            return this;
        }
        uint64BE(value) {
            this.align(this.eightByteAlignment, 8);
            this.view.setBigUint64(this.offset, value, false);
            this.offset += 8;
            return this;
        }
        float32(value) {
            this.align(4);
            this.view.setFloat32(this.offset, value, this.littleEndian);
            this.offset += 4;
            return this;
        }
        float64(value) {
            this.align(this.eightByteAlignment, 8);
            this.view.setFloat64(this.offset, value, this.littleEndian);
            this.offset += 8;
            return this;
        }
        string(value, writeLength = true) {
            const strlen = value.length;
            if (writeLength) {
                this.uint32(strlen + 1);
            }
            this.resizeIfNeeded(strlen + 1);
            textEncoder.encodeInto(value, new Uint8Array(this.buffer, this.offset, strlen));
            this.view.setUint8(this.offset + strlen, 0);
            this.offset += strlen + 1;
            return this;
        }
        dHeader(objectSize) {
            const header = objectSize;
            this.uint32(header);
            return this;
        }
        emHeader(mustUnderstand, id, objectSize, lengthCode) {
            return this.isCDR2 ? this.memberHeaderV2(mustUnderstand, id, objectSize, lengthCode) : this.memberHeaderV1(mustUnderstand, id, objectSize);
        }
        memberHeaderV1(mustUnderstand, id, objectSize) {
            this.align(4);
            const mustUnderstandFlag = mustUnderstand ? 1 << 14 : 0;
            const shouldUseExtendedPID = id > 16128 || objectSize > 65535;
            if (!shouldUseExtendedPID) {
                const idHeader = mustUnderstandFlag | id;
                this.uint16(idHeader);
                const objectSizeHeader = objectSize & 65535;
                this.uint16(objectSizeHeader);
            } else {
                const extendedHeader = mustUnderstandFlag | reservedPIDs.EXTENDED_PID;
                this.uint16(extendedHeader);
                this.uint16(8);
                this.uint32(id);
                this.uint32(objectSize);
            }
            this.resetOrigin();
            return this;
        }
        resetOrigin() {
            this.origin = this.offset;
        }
        sentinelHeader() {
            if (!this.isCDR2) {
                this.align(4);
                this.uint16(reservedPIDs.SENTINEL_PID);
                this.uint16(0);
            }
            return this;
        }
        memberHeaderV2(mustUnderstand, id, objectSize, lengthCode) {
            if (id > 268435455) {
                throw Error(`Member ID ${id} is too large. Max value is ${268435455}`);
            }
            const mustUnderstandFlag = mustUnderstand ? 1 << 31 : 0;
            const finalLengthCode = lengthCode != null ? lengthCode : (0, lengthCodes.getLengthCodeForObjectSize)(objectSize);
            const header = mustUnderstandFlag | finalLengthCode << 28 | id;
            this.uint32(header);
            switch (finalLengthCode) {
                case 0:
                case 1:
                case 2:
                case 3: {
                    const shouldBeSize = lengthCodes.lengthCodeToObjectSizes[finalLengthCode];
                    if (objectSize !== shouldBeSize) {
                        throw new Error(`Cannot write a length code ${finalLengthCode} header with an object size not equal to ${shouldBeSize}`);
                    }
                    break;
                }
                case 4:
                case 5:
                    this.uint32(objectSize);
                    break;
                case 6:
                    if (objectSize % 4 !== 0) {
                        throw new Error("Cannot write a length code 6 header with an object size that is not a multiple of 4");
                    }
                    this.uint32(objectSize >> 2);
                    break;
                case 7:
                    if (objectSize % 8 !== 0) {
                        throw new Error("Cannot write a length code 7 header with an object size that is not a multiple of 8");
                    }
                    this.uint32(objectSize >> 3);
                    break;
                default:
                    throw new Error(`Unexpected length code ${finalLengthCode}`);
            }
            return this;
        }
        sequenceLength(value) {
            return this.uint32(value);
        }
        int8Array(value, writeLength) {
            if (writeLength === true) {
                this.sequenceLength(value.length);
            }
            this.resizeIfNeeded(value.length);
            this.array.set(value, this.offset);
            this.offset += value.length;
            return this;
        }
        uint8Array(value, writeLength) {
            if (writeLength === true) {
                this.sequenceLength(value.length);
            }
            this.resizeIfNeeded(value.length);
            this.array.set(value, this.offset);
            this.offset += value.length;
            return this;
        }
        int16Array(value, writeLength) {
            if (writeLength === true) {
                this.sequenceLength(value.length);
            }
            if (value instanceof Int16Array && this.littleEndian === this.hostLittleEndian && value.length >= CdrWriter2.BUFFER_COPY_THRESHOLD) {
                this.align(value.BYTES_PER_ELEMENT, value.byteLength);
                this.array.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength), this.offset);
                this.offset += value.byteLength;
            } else {
                for (const entry of value) {
                    this.int16(entry);
                }
            }
            return this;
        }
        uint16Array(value, writeLength) {
            if (writeLength === true) {
                this.sequenceLength(value.length);
            }
            if (value instanceof Uint16Array && this.littleEndian === this.hostLittleEndian && value.length >= CdrWriter2.BUFFER_COPY_THRESHOLD) {
                this.align(value.BYTES_PER_ELEMENT, value.byteLength);
                this.array.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength), this.offset);
                this.offset += value.byteLength;
            } else {
                for (const entry of value) {
                    this.uint16(entry);
                }
            }
            return this;
        }
        int32Array(value, writeLength) {
            if (writeLength === true) {
                this.sequenceLength(value.length);
            }
            if (value instanceof Int32Array && this.littleEndian === this.hostLittleEndian && value.length >= CdrWriter2.BUFFER_COPY_THRESHOLD) {
                this.align(value.BYTES_PER_ELEMENT, value.byteLength);
                this.array.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength), this.offset);
                this.offset += value.byteLength;
            } else {
                for (const entry of value) {
                    this.int32(entry);
                }
            }
            return this;
        }
        uint32Array(value, writeLength) {
            if (writeLength === true) {
                this.sequenceLength(value.length);
            }
            if (value instanceof Uint32Array && this.littleEndian === this.hostLittleEndian && value.length >= CdrWriter2.BUFFER_COPY_THRESHOLD) {
                this.align(value.BYTES_PER_ELEMENT, value.byteLength);
                this.array.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength), this.offset);
                this.offset += value.byteLength;
            } else {
                for (const entry of value) {
                    this.uint32(entry);
                }
            }
            return this;
        }
        int64Array(value, writeLength) {
            if (writeLength === true) {
                this.sequenceLength(value.length);
            }
            if (value instanceof BigInt64Array && this.littleEndian === this.hostLittleEndian && value.length >= CdrWriter2.BUFFER_COPY_THRESHOLD) {
                this.align(value.BYTES_PER_ELEMENT, value.byteLength);
                this.array.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength), this.offset);
                this.offset += value.byteLength;
            } else {
                for (const entry of value) {
                    this.int64(BigInt(entry));
                }
            }
            return this;
        }
        uint64Array(value, writeLength) {
            if (writeLength === true) {
                this.sequenceLength(value.length);
            }
            if (value instanceof BigUint64Array && this.littleEndian === this.hostLittleEndian && value.length >= CdrWriter2.BUFFER_COPY_THRESHOLD) {
                this.align(value.BYTES_PER_ELEMENT, value.byteLength);
                this.array.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength), this.offset);
                this.offset += value.byteLength;
            } else {
                for (const entry of value) {
                    this.uint64(BigInt(entry));
                }
            }
            return this;
        }
        float32Array(value, writeLength) {
            if (writeLength === true) {
                this.sequenceLength(value.length);
            }
            if (value instanceof Float32Array && this.littleEndian === this.hostLittleEndian && value.length >= CdrWriter2.BUFFER_COPY_THRESHOLD) {
                this.align(value.BYTES_PER_ELEMENT, value.byteLength);
                this.array.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength), this.offset);
                this.offset += value.byteLength;
            } else {
                for (const entry of value) {
                    this.float32(entry);
                }
            }
            return this;
        }
        float64Array(value, writeLength) {
            if (writeLength === true) {
                this.sequenceLength(value.length);
            }
            if (value instanceof Float64Array && this.littleEndian === this.hostLittleEndian && value.length >= CdrWriter2.BUFFER_COPY_THRESHOLD) {
                this.align(value.BYTES_PER_ELEMENT, value.byteLength);
                this.array.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength), this.offset);
                this.offset += value.byteLength;
            } else {
                for (const entry of value) {
                    this.float64(entry);
                }
            }
            return this;
        }
        align(size, bytesToWrite = size) {
            const alignment = (this.offset - this.origin) % size;
            const padding = alignment > 0 ? size - alignment : 0;
            this.resizeIfNeeded(padding + bytesToWrite);
            this.array.fill(0, this.offset, this.offset + padding);
            this.offset += padding;
        }
        resizeIfNeeded(additionalBytes) {
            const capacity = this.offset + additionalBytes;
            if (this.buffer.byteLength < capacity) {
                const doubled = this.buffer.byteLength * 2;
                const newCapacity = doubled > capacity ? doubled : capacity;
                this.resize(newCapacity);
            }
        }
        resize(capacity) {
            if (this.buffer.byteLength >= capacity) {
                return;
            }
            const buffer = new ArrayBuffer(capacity);
            const array = new Uint8Array(buffer);
            array.set(this.array);
            this.buffer = buffer;
            this.array = array;
            this.view = new DataView(buffer);
        }
    }
    exports.CdrWriter = CdrWriter2;
    CdrWriter2.DEFAULT_CAPACITY = 16;
    CdrWriter2.BUFFER_COPY_THRESHOLD = 10;
});
var dist = createCommonjsModule(function (module, exports) {
    var __createBinding = commonjsGlobal && commonjsGlobal.__createBinding || (Object.create ? function (o, m, k, k2) {
        if (k2 === void 0)
            k2 = k;
        Object.defineProperty(o, k2, {
            enumerable: true, get: function () {
                return m[k];
            }
        });
    } : function (o, m, k, k2) {
        if (k2 === void 0)
            k2 = k;
        o[k2] = m[k];
    });
    var __exportStar = commonjsGlobal && commonjsGlobal.__exportStar || function (m, exports2) {
        for (var p in m)
            if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p))
                __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(CdrReader_1, exports);
    __exportStar(CdrSizeCalculator_1, exports);
    __exportStar(CdrWriter_1, exports);
    __exportStar(EncapsulationKind_1, exports);
});
var __pika_web_default_export_for_treeshaking__ = /* @__PURE__ */ getDefaultExportFromCjs(dist);
var CdrReader = dist.CdrReader;
var CdrSizeCalculator = dist.CdrSizeCalculator;
var CdrWriter = dist.CdrWriter;
var EncapsulationKind = dist.EncapsulationKind;
export default __pika_web_default_export_for_treeshaking__;
export { CdrReader, CdrSizeCalculator, CdrWriter, EncapsulationKind, dist as __moduleExports };