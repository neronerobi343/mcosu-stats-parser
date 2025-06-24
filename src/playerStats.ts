import { Score, BeatmapScores } from "./ScoresParser";
import { sleep } from "./helpers";

// was part of the McOsu codebase
const SANE_PP_LIMIT = 10000;

interface PPScore {
    ppScores: Score[],
    totalScore: bigint
}

interface DisplayScore {
    beatmapSetId: string,
    beatmapName: string,
    artist: string,
    difficultyName: string,
    date: string;
    mods: string[];
    accuracy: number;
    weight: number;
    rawPP: number;
    weightPP: number;
    speedMultiplier: number;
}

interface BeatmapDetails {
    beatmapset_id: string,
    title: string,
    artist: string,
    version: string, //difficulty name
}

interface PlayerStats {
    name: string,
    pp: number,
    accuracy: number,
    level: number,
    percentToNextLevel: number,
    totalScore: string,
    totalPPScores: number,
}

export function calculatePlayerStats(ppScore: PPScore, playerName: string): PlayerStats {
    const ppScores = ppScore.ppScores;
    const totalScoreBI = ppScore.totalScore;
    let pp: number = 0;
    let acc: number = 0;
    ppScores.forEach((score, i) => {
        if (score) {
            const weight = getWeightForIndex(ppScores.length - 1 - i);
            pp += score.pp * weight;
            acc += Math.fround(calculateAccuracy(score.count300, score.count100, score.count50, score.countMiss)) * weight;
        }
    })
    
    //bonus PP
    pp += (417.0 - 1.0 / 3.0) * (1.0 - Math.pow(0.995, Math.min(1000.0, ppScores.length)));
    
    //normalize accuracy
    if (ppScores.length > 0) {
        acc /= Math.fround(20 * Math.fround(1 - getWeightForIndex(ppScores.length)));
    }
    
    const level = getLevelForScore(totalScoreBI);
    const requiredScoreForCurrentLevel = getRequiredScoreForLevel(level);
    const requiredScoreForNextLevel = getRequiredScoreForLevel(level + 1);
    const percentToNextLevel = Number((totalScoreBI - requiredScoreForCurrentLevel)) / Number((requiredScoreForNextLevel - requiredScoreForCurrentLevel));
    
    const totalScoreStr = totalScoreBI.toString();
    
    return {
        name: playerName,
        pp,
        accuracy: acc,
        level,
        percentToNextLevel,
        totalScore: totalScoreStr.substring(0, totalScoreStr.length - 1),
        totalPPScores: ppScores.length
    }
}

export async function getTopScores(ppScore: PPScore, amount: number, apiKey: string): Promise<DisplayScore[]> {
    let topDisplayScores: DisplayScore[] = [];
    const { ppScores } = ppScore;
    const topPPScores = ppScores.slice(ppScores.length - amount);
    for (let i = 0; i < topPPScores.length; i++) {
        try {
            const ds = await getDisplayScore(topPPScores[i], topPPScores.length, i, apiKey);
            topDisplayScores.push(ds);
            await sleep(250);
        } catch(err) {
            // console.log(err);
            console.log("Beatmap not found in osu! beatmap listing. Skipping...")
        }
    }
    // console.log("topDisplayScores", topDisplayScores)

    return topDisplayScores.sort((a, b) => b.rawPP - a.rawPP);
}

export async function getRecentScores(beatmapScores: BeatmapScores[], amount: number, playerName: string, apiKey: string): Promise<DisplayScore[]> {
    const playerScores: Score[] = [];
    const datedDisplayScores: DisplayScore[] = [];
    for (const beatmap of beatmapScores) {
        for (const score of beatmap.scores) {
            if (score && score.playerName === playerName) {
                playerScores.push(score);
            }
        }
    }
    // console.log("playerScores", playerScores)
    
    const scoresByDate = playerScores.sort((a, b) => Number(b.unixTimestamp - a.unixTimestamp)).slice(0, amount);
    for (let i = 0; i < scoresByDate.length; i++) {
        if (scoresByDate[i]) {
            try {
                const ds = await getDisplayScore(scoresByDate[i], 1, 0 , apiKey);
                datedDisplayScores.push(ds);
                await sleep(250);
            } catch(err) {
                console.log("Beatmap not found in osu! beatmap listing. Skipping...")
            }
        }

    }
    // console.log(datedDisplayScores);

    return datedDisplayScores;
}

async function getDisplayScore(score: Score, topScoresLen: number, index: number, apiKey: string): Promise<DisplayScore> {
    const url = `https://osu.ppy.sh/api/get_beatmaps?k=${apiKey}&m=0&h=${score.beatmapHash}`;
    const response = await fetch(url);
    const rjson = (await response.json() as BeatmapDetails[])[0];
    // console.log(rjson);

    const weight = getWeightForIndex(topScoresLen - 1 - index);
    const ds: DisplayScore = {
        beatmapSetId: rjson["beatmapset_id"],
        beatmapName: rjson["title"],
        artist: rjson["artist"],
        difficultyName: rjson["version"],
        date: new Date(Number(score.unixTimestamp * BigInt(1000))).toString(),
        mods: getEnabledMods(score.modsLegacy),
        accuracy: Math.fround(calculateAccuracy(score.count300, score.count100, score.count50, score.countMiss)) * 100,
        weight: weight * 100,
        rawPP: score.pp,
        weightPP: score.pp * weight,
        speedMultiplier: Number(score.speedMultiplier.toFixed(2))
    }
    
    return ds;
}

export function calculatePPScores(beatmapScores: BeatmapScores[], playerName: string, countRelaxScores: boolean, countAutopilotScores: boolean): PPScore {
    let totalScore = 0n;
    let allPPScores: Score[] = [];

    for (const beatmap of beatmapScores) {
        let saneScores: Score[] = [];
        for (const score of beatmap.scores) {
            const mods = getEnabledMods(score.modsLegacy);
            if ((countRelaxScores === false && mods.includes("RX")) || (countAutopilotScores === false && mods.includes("AP"))) continue;

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

    return {ppScores: allPPScores, totalScore};
}

function calculateAccuracy(num300s: number, num100s: number, num50s: number, numMisses: number) {
    const totalHitPoints = Math.fround(num50s*(1/6)) + Math.fround(num100s*(2/6)) + num300s;
    const totalNumHits = Math.fround(numMisses + num50s + num100s + num300s);
    
    return totalNumHits > 0 ? Math.fround(totalHitPoints / totalNumHits) : 0;
}

function getWeightForIndex(i: number) {
    return Math.pow(0.95, i);
}

function getLevelForScore(score: bigint) {
    let i = 0;
    while (true) {
        const levelScore = getRequiredScoreForLevel(i);
        if (score < levelScore) return (i - 1);

        i++
    }
}

function getRequiredScoreForLevel(level: number) {
    if (level <= 100) {
        if (level > 1) {
            return BigInt(Math.floor( 5000/3*(4 * Math.pow(level, 3) - 3 * Math.pow(level, 2) - level) + Math.floor(1.25 * Math.pow(1.8, (level - 60)))));
        }
        return 1n;
    }
    
    return BigInt(26931190829) + BigInt(100000000000) * BigInt(level - 100);
}

function getEnabledMods(modValue: number): string[] {
    const modMap: [string, number][] = [
        ["NF", 1 << 0],   // NoFail
        ["EZ", 1 << 1],   // Easy
        ["TD", 1 << 2],   // TouchDevice
        ["HD", 1 << 3],   // Hidden
        ["HR", 1 << 4],   // HardRock
        ["SD", 1 << 5],   // SuddenDeath
        ["DT", 1 << 6],   // DoubleTime
        ["RX", 1 << 7],   // Relax
        ["HT", 1 << 8],   // HalfTime
        ["NC", 1 << 9],   // Nightcore (implies DT)
        ["FL", 1 << 10],  // Flashlight
        ["AT", 1 << 11],  // Autoplay
        ["SO", 1 << 12],  // SpunOut
        ["AP", 1 << 13],  // Relax2 / Autopilot
        ["PF", 1 << 14],  // Perfect (implies SD)
    ];

    const enabledMods: string[] = [];

    for (const [modAbbrev, bit] of modMap) {
        if ((modValue & bit) !== 0) {
            // Skip DT if NC is set
            if (modAbbrev === "DT" && (modValue & (1 << 9))) {
                continue;
            }
            // Skip SD if PF is set
            if (modAbbrev === "SD" && (modValue & (1 << 14))) {
                continue;
            }
            enabledMods.push(modAbbrev);
        }
    }

    return enabledMods;
}