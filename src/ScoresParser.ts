import { BufferReader } from "./BufferReader";

export interface Score {
	beatmapHash: string;
	mode: number;
	version: number;
	unixTimestamp: bigint;
	playerName: string;
	count300: number;
	count100: number;
	count50: number;
	countGeki: number;
	countKatu: number;
	countMiss: number;
	score: bigint;
	maxCombo: number;
	modsLegacy: number;
	numSliderBreaks: number;
	pp: number;
	unstableRate: number;
	hitErrAvgMin: number;
	hitErrAvgMax: number;
	starsTomTotal: number;
	starsTomAim: number;
	starsTomSpeed: number;
	speedMultiplier: number;
	CS: number;
	AR: number;
	OD: number;
	HP: number;
	maxPossibleCombo: number;
	numHitObjects: number;
	numCircles: number;
	experimentalMods: string;
}

export interface BeatmapScores {
	beatmapHash: string;
	scores: Score[];
}

export class ScoresDbParser {
	private _bufferReader!: BufferReader;
	private _beatmapScores: BeatmapScores[] = [];

	constructor(scoresBuffer: Buffer) {
		this._bufferReader = new BufferReader(scoresBuffer);
	}
	
	parseScore(outerBeatmapHash: string): Score {
		const beatmapHash = outerBeatmapHash;
		const mode = this._bufferReader.readByte();
		const version = this._bufferReader.readInt();
		const unixTimestamp = this._bufferReader.readLongLong();
		const playerName = this._bufferReader.readString();
		const count300 = this._bufferReader.readShort();
		const count100 = this._bufferReader.readShort();
		const count50 = this._bufferReader.readShort();
		const countGeki = this._bufferReader.readShort();
		const countKatu = this._bufferReader.readShort();
		const countMiss = this._bufferReader.readShort();
		const score = this._bufferReader.readLongLong();
		const maxCombo = this._bufferReader.readShort();
		const modsLegacy = this._bufferReader.readInt();
		
		const numSliderBreaks = this._bufferReader.readShort();
		const pp = this._bufferReader.readFloat();
		const unstableRate = this._bufferReader.readFloat();
		const hitErrAvgMin = this._bufferReader.readFloat();
		const hitErrAvgMax = this._bufferReader.readFloat();
		const starsTomTotal = this._bufferReader.readFloat();
		const starsTomAim = this._bufferReader.readFloat();
		const starsTomSpeed = this._bufferReader.readFloat();
		const speedMultiplier = this._bufferReader.readFloat();
		const CS = this._bufferReader.readFloat();
		const AR = this._bufferReader.readFloat();
		const OD = this._bufferReader.readFloat();
		const HP = this._bufferReader.readFloat();
		
		let maxPossibleCombo = -1;
		let numHitObjects = -1;
		let numCircles = -1;
		if (version > 20180722) {
			maxPossibleCombo = this._bufferReader.readInt();
			numHitObjects = this._bufferReader.readInt();
			numCircles = this._bufferReader.readInt();
		}
		
		const experimentalMods = this._bufferReader.readString();

		const scoreObj: Score = {
			beatmapHash,
			mode,
			version,
			unixTimestamp,
			playerName,
			count300,
			count100,
			count50,
			countGeki,
			countKatu,
			countMiss,
			score,
			maxCombo,
			modsLegacy,
			numSliderBreaks,
			pp,
			unstableRate,
			hitErrAvgMin,
			hitErrAvgMax,
			starsTomTotal,
			starsTomAim,
			starsTomSpeed,
			speedMultiplier,
			CS,
			AR,
			OD,
			HP,
			maxPossibleCombo,
			numHitObjects,
			numCircles,
			experimentalMods
		};

		return scoreObj;
	}

	parse() {
		const version = this._bufferReader.readInt();
		const numBeatmaps = this._bufferReader.readInt();

		for (let i = 0; i < numBeatmaps; i++) {
			const beatmapHash = this._bufferReader.readString();
			const numScores = this._bufferReader.readInt();
			const scores: Score[] = [];

			for (let j = 0; j < numScores; j++) {
				scores.push(this.parseScore(beatmapHash));
			}

			this._beatmapScores.push({ beatmapHash, scores });
		}
	}

	get beatmapScores() {
		return this._beatmapScores;
	}
	
}