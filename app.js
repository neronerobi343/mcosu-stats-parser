"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// app.ts
var import_promises = __toESM(require("fs/promises"));

// BufferReader.ts
var BufferReader = class {
  constructor(_buffer) {
    this._buffer = _buffer;
    this._offset = 0;
  }
  readByte() {
    return this._buffer.readUInt8(this._offset++);
  }
  readBoolean() {
    return this.readByte() === 1;
  }
  readShort() {
    const value = this._buffer.readUInt16LE(this._offset);
    this._offset += 2;
    return value;
  }
  readInt() {
    const value = this._buffer.readInt32LE(this._offset);
    this._offset += 4;
    return value;
  }
  readLongLong() {
    const value = this._buffer.readBigInt64LE(this._offset);
    this._offset += 8;
    return value;
  }
  readFloat() {
    const value = this._buffer.readFloatLE(this._offset);
    this._offset += 4;
    return value;
  }
  readULEB128() {
    let result = 0;
    let shift = 0;
    let byte = 0;
    do {
      byte = this._buffer[this._offset++];
      result |= (byte & 127) << shift;
      shift += 7;
    } while (byte & 128);
    return result;
  }
  readString() {
    const marker = this.readByte();
    if (marker === 0) return "";
    if (marker !== 11) {
      throw new Error(`Invalid string marker: ${marker} at offset ${this._offset - 1}`);
    }
    const strLen = this.readULEB128();
    const str = this._buffer.toString("utf8", this._offset, this._offset + strLen);
    this._offset += strLen;
    return str;
  }
  getRemaining() {
    return this._buffer.length - this._offset;
  }
  get offset() {
    return this._offset;
  }
  set offset(num) {
    this._offset = num;
  }
};

// ScoresParser.ts
var ScoresDbParser = class {
  constructor(scoresBuffer) {
    this._beatmapScores = [];
    this._bufferReader = new BufferReader(scoresBuffer);
  }
  parseScore() {
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
    const scoreObj = {
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
      const scores = [];
      for (let j = 0; j < numScores; j++) {
        scores.push(this.parseScore());
      }
      this._beatmapScores.push({ beatmapHash, scores });
    }
  }
  get beatmapScores() {
    return this._beatmapScores;
  }
};

// playerStats.ts
var SANE_PP_LIMIT = 1e4;
function calculatePlayerStats(beatmapScores, playerName) {
  const { ppScores, totalScore } = calculatePPScores(beatmapScores, playerName);
  let pp = 0;
  let acc = 0;
  ppScores.forEach((score, i) => {
    if (score) {
      const weight = getWeightForIndex(ppScores.length - 1 - i);
      pp += score.pp * weight;
      acc += Math.fround(calculateAccuracy(score.count300, score.count100, score.count50, score.countMiss)) * weight;
    }
  });
  pp += (417 - 1 / 3) * (1 - Math.pow(0.995, Math.min(1e3, ppScores.length)));
  if (ppScores.length > 0) {
    acc /= Math.fround(20 * Math.fround(1 - getWeightForIndex(ppScores.length)));
  }
  const level = getLevelForScore(totalScore);
  const requiredScoreForCurrentLevel = getRequiredScoreForLevel(level);
  const requiredScoreForNextLevel = getRequiredScoreForLevel(level + 1);
  const percentToNextLevel = Number(totalScore - requiredScoreForCurrentLevel) / Number(requiredScoreForNextLevel - requiredScoreForCurrentLevel);
  return {
    name: playerName,
    pp,
    accuracy: acc,
    level,
    percentToNextLevel,
    totalScore,
    totalPPScores: ppScores.length
  };
}
function calculatePPScores(beatmapScores, playerName) {
  let totalScore = 0n;
  let allPPScores = [];
  for (const beatmap of beatmapScores) {
    let saneScores = [];
    for (const score of beatmap.scores) {
      if (score.pp < SANE_PP_LIMIT && score.playerName === playerName) {
        saneScores.push(score);
        totalScore += BigInt(score.score);
      }
    }
    const highestPPScore = saneScores.sort((a, b) => b.pp - a.pp)[0];
    if (highestPPScore) {
      allPPScores.push(highestPPScore);
    }
  }
  const sortppScores = allPPScores.sort((a, b) => a.pp - b.pp);
  return { ppScores: sortppScores, totalScore };
}
function calculateAccuracy(num300s, num100s, num50s, numMisses) {
  const totalHitPoints = Math.fround(num50s * (1 / 6)) + Math.fround(num100s * (2 / 6)) + num300s;
  const totalNumHits = Math.fround(numMisses + num50s + num100s + num300s);
  return totalNumHits > 0 ? Math.fround(totalHitPoints / totalNumHits) : 0;
}
function getWeightForIndex(i) {
  return Math.pow(0.95, i);
}
function getLevelForScore(score) {
  let i = 0;
  while (true) {
    const levelScore = getRequiredScoreForLevel(i);
    if (score < levelScore) return i - 1;
    i++;
  }
}
function getRequiredScoreForLevel(level) {
  if (level <= 100) {
    if (level > 1) {
      return BigInt(Math.floor(5e3 / 3 * (4 * Math.pow(level, 3) - 3 * Math.pow(level, 2) - level) + Math.floor(1.25 * Math.pow(1.8, level - 60))));
    }
    return 1n;
  }
  return BigInt(26931190829) + BigInt(1e11) * BigInt(level - 100);
}

// app.ts
async function main() {
  try {
    console.time("\u2705 SCORE PARSING COMPLETE");
    const { scoresDbPath, playerName, outputJsonPath } = JSON.parse(await import_promises.default.readFile("settings.json", "utf8"));
    if (playerName === "") throw new Error("Player name is empty.");
    const scoreBuffer = await import_promises.default.readFile(scoresDbPath);
    const sp = new ScoresDbParser(scoreBuffer);
    sp.parse();
    const stats = calculatePlayerStats(sp.beatmapScores, playerName);
    await import_promises.default.writeFile(outputJsonPath, JSON.stringify(
      stats,
      (key, value) => {
        if (typeof value === "bigint") {
          const valStr = value.toString();
          return valStr.substring(0, valStr.length - 1);
        }
        return value;
      },
      2
    ));
    console.timeEnd("\u2705 SCORE PARSING COMPLETE");
    console.log(`Output written to ${outputJsonPath}`);
  } catch (err) {
    console.log(err);
    console.log("\u274C SCORE PARSING FAILED");
  }
}
main();
