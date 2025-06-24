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
  parseScore(outerBeatmapHash) {
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
    const scoreObj = {
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
      const scores = [];
      for (let j = 0; j < numScores; j++) {
        scores.push(this.parseScore(beatmapHash));
      }
      this._beatmapScores.push({ beatmapHash, scores });
    }
  }
  get beatmapScores() {
    return this._beatmapScores;
  }
};

// helpers.ts
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// playerStats.ts
var SANE_PP_LIMIT = 1e4;
function calculatePlayerStats(ppScore, playerName) {
  const ppScores = ppScore.ppScores;
  const totalScoreBI = ppScore.totalScore;
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
  const level = getLevelForScore(totalScoreBI);
  const requiredScoreForCurrentLevel = getRequiredScoreForLevel(level);
  const requiredScoreForNextLevel = getRequiredScoreForLevel(level + 1);
  const percentToNextLevel = Number(totalScoreBI - requiredScoreForCurrentLevel) / Number(requiredScoreForNextLevel - requiredScoreForCurrentLevel);
  const totalScoreStr = totalScoreBI.toString();
  return {
    name: playerName,
    pp,
    accuracy: acc,
    level,
    percentToNextLevel,
    totalScore: totalScoreStr.substring(0, totalScoreStr.length - 1),
    totalPPScores: ppScores.length
  };
}
async function getTopScores(ppScore, amount, apiKey) {
  let topDisplayScores = [];
  const { ppScores } = ppScore;
  const topPPScores = ppScores.slice(ppScores.length - amount);
  for (let i = 0; i < topPPScores.length; i++) {
    try {
      const ds = await getDisplayScore(topPPScores[i], topPPScores.length, i, apiKey);
      topDisplayScores.push(ds);
      await sleep(250);
    } catch (err) {
      console.log(err);
    }
  }
  return topDisplayScores.sort((a, b) => b.rawPP - a.rawPP);
}
async function getRecentScores(beatmapScores, amount, playerName, apiKey) {
  const playerScores = [];
  const datedDisplayScores = [];
  for (const beatmap of beatmapScores) {
    for (const score of beatmap.scores) {
      if (score && score.playerName === playerName) {
        playerScores.push(score);
      }
    }
  }
  const scoresByDate = playerScores.sort((a, b) => Number(b.unixTimestamp - a.unixTimestamp)).slice(0, amount);
  for (let i = 0; i < scoresByDate.length; i++) {
    if (scoresByDate[i]) {
      try {
        const ds = await getDisplayScore(scoresByDate[i], 1, 0, apiKey);
        datedDisplayScores.push(ds);
        await sleep(250);
      } catch (err) {
        console.log(err);
      }
    }
  }
  return datedDisplayScores;
}
async function getDisplayScore(score, topScoresLen, index, apiKey) {
  const url = `https://osu.ppy.sh/api/get_beatmaps?k=${apiKey}&m=0&h=${score.beatmapHash}`;
  const response = await fetch(url);
  const rjson = (await response.json())[0];
  let beatmapSetId, beatmapName, artist, difficultyName;
  if (!rjson) {
    beatmapSetId = "";
    beatmapName = "???";
    artist = "Unknown";
    difficultyName = "???";
  } else {
    beatmapSetId = rjson["beatmapset_id"];
    beatmapName = rjson["title"];
    artist = rjson["artist"];
    difficultyName = rjson["version"];
  }
  const weight = getWeightForIndex(topScoresLen - 1 - index);
  const ds = {
    beatmapSetId,
    beatmapName,
    artist,
    difficultyName,
    date: new Date(Number(score.unixTimestamp * BigInt(1e3))).toString(),
    mods: getEnabledMods(score.modsLegacy),
    accuracy: Math.fround(calculateAccuracy(score.count300, score.count100, score.count50, score.countMiss)) * 100,
    weight: weight * 100,
    rawPP: score.pp,
    weightPP: score.pp * weight,
    speedMultiplier: Number(score.speedMultiplier.toFixed(2))
  };
  return ds;
}
function calculatePPScores(beatmapScores, playerName, countRelaxScores, countAutopilotScores) {
  let totalScore = 0n;
  let allPPScores = [];
  for (const beatmap of beatmapScores) {
    let saneScores = [];
    for (const score of beatmap.scores) {
      const mods = getEnabledMods(score.modsLegacy);
      if (countRelaxScores === false && mods.includes("RX") || countAutopilotScores === false && mods.includes("AP")) continue;
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
  if (allPPScores.length === 0) {
    throw new Error(`There were no scores found for playerName "${playerName}"`);
  }
  allPPScores.sort((a, b) => a.pp - b.pp);
  return { ppScores: allPPScores, totalScore };
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
function getEnabledMods(modValue) {
  const modMap = [
    ["NF", 1 << 0],
    // NoFail
    ["EZ", 1 << 1],
    // Easy
    ["TD", 1 << 2],
    // TouchDevice
    ["HD", 1 << 3],
    // Hidden
    ["HR", 1 << 4],
    // HardRock
    ["SD", 1 << 5],
    // SuddenDeath
    ["DT", 1 << 6],
    // DoubleTime
    ["RX", 1 << 7],
    // Relax
    ["HT", 1 << 8],
    // HalfTime
    ["NC", 1 << 9],
    // Nightcore (implies DT)
    ["FL", 1 << 10],
    // Flashlight
    ["AT", 1 << 11],
    // Autoplay
    ["SO", 1 << 12],
    // SpunOut
    ["AP", 1 << 13],
    // Relax2 / Autopilot
    ["PF", 1 << 14]
    // Perfect (implies SD)
  ];
  const enabledMods = [];
  for (const [modAbbrev, bit] of modMap) {
    if ((modValue & bit) !== 0) {
      if (modAbbrev === "DT" && modValue & 1 << 9) {
        continue;
      }
      if (modAbbrev === "SD" && modValue & 1 << 14) {
        continue;
      }
      enabledMods.push(modAbbrev);
    }
  }
  return enabledMods;
}

// app.ts
async function main() {
  try {
    console.time("\u2705 SCORE PARSING COMPLETE");
    const {
      scoresDbPath,
      playerName,
      outputJsonPath,
      osuApiKey,
      parseTopScores,
      parseRecentScores,
      amountTopScores,
      amountRecentScores,
      countRelaxScores,
      countAutopilotScores
    } = JSON.parse(await import_promises.default.readFile("settings.json", "utf8"));
    if (playerName === "") throw new Error("Player name is empty.");
    if (osuApiKey === "" && (parseTopScores || parseRecentScores)) throw new Error("getTopScores or getRecentScores was requested in settings.json, but osu! API key is not provided.");
    const scoreBuffer = await import_promises.default.readFile(scoresDbPath);
    const sp = new ScoresDbParser(scoreBuffer);
    let outputObj = {};
    sp.parse();
    console.log("Parsing valid scores...");
    const ppScores = calculatePPScores(sp.beatmapScores, playerName, countRelaxScores, countAutopilotScores);
    console.log("Parsing player stats...");
    const stats = calculatePlayerStats(ppScores, playerName);
    outputObj.playerStats = stats;
    if (parseTopScores) {
      console.log("Parsing top scores...");
      console.time("Top scores parsed");
      const topScores = await getTopScores(ppScores, amountTopScores, osuApiKey);
      outputObj.topScores = topScores;
      console.timeEnd("Top scores parsed");
    }
    if (parseRecentScores) {
      console.log("Parsing recent scores...");
      console.time("Recent scores parsed");
      const recentScores = await getRecentScores(sp.beatmapScores, amountRecentScores, playerName, osuApiKey);
      outputObj.recentScores = recentScores;
      console.timeEnd("Recent scores parsed");
    }
    await import_promises.default.writeFile(outputJsonPath, JSON.stringify(outputObj, null, 2));
    console.timeEnd("\u2705 SCORE PARSING COMPLETE");
    console.log(`Output written to ${outputJsonPath}`);
  } catch (err) {
    console.log(err);
    console.log("\u274C SCORE PARSING FAILED");
  }
}
main();
