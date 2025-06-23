export class BufferReader {
	private _offset: number = 0;

	constructor(private _buffer: Buffer) { }

	readByte(): number {
		return this._buffer.readUInt8(this._offset++);
	}

	readBoolean(): boolean {
		return this.readByte() === 1;
	}

	readShort(): number {
		const value = this._buffer.readUInt16LE(this._offset);
		this._offset += 2;
		return value;
	}

	readInt(): number {
		const value = this._buffer.readInt32LE(this._offset);
		this._offset += 4;
		return value;
	}

	readLongLong(): bigint {
		const value = this._buffer.readBigInt64LE(this._offset);
		this._offset += 8;
		return value;
	}

	readFloat(): number {
		const value = this._buffer.readFloatLE(this._offset);
		this._offset += 4;
		return value;
	}

	readULEB128(): number {
		let result = 0;
		let shift = 0;
		let byte = 0;

		do {
			byte = this._buffer[this._offset++];
			result |= (byte & 0x7f) << shift;
			shift += 7;
		} while (byte & 0x80);

		return result;
	}

	readString(): string {
		const marker = this.readByte();
		if (marker === 0x00) return '';
		if (marker !== 0x0b) {
			throw new Error(`Invalid string marker: ${marker} at offset ${this._offset - 1}`);
		}

		const strLen = this.readULEB128();
		const str = this._buffer.toString('utf8', this._offset, this._offset + strLen);
		this._offset += strLen;
		return str;
	}

	getRemaining(): number {
    	return this._buffer.length - this._offset;
	}
	
	get offset() {
		return this._offset;
	}
	
	set offset(num: number) {
		this._offset = num;
	}
}
