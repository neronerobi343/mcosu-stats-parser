import { Score, BeatmapScores } from "./ScoresParser";

// was part of the McOsu codebase
const SANE_PP_LIMIT = 10000;

interface PPScore {
    ppScores: Score[],
    totalScore: bigint
}

interface PlayerStats {
    name: string,
    pp: number,
    accuracy: number,
    level: number,
    percentToNextLevel: number,
    totalScore: bigint,
    totalPPScores: number,
}

export function calculatePlayerStats(beatmapScores: BeatmapScores[], playerName: string): PlayerStats {
    const { ppScores, totalScore } = calculatePPScores(beatmapScores, playerName);
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
    
    const level = getLevelForScore(totalScore);
    const requiredScoreForCurrentLevel = getRequiredScoreForLevel(level);
    const requiredScoreForNextLevel = getRequiredScoreForLevel(level + 1);
    const percentToNextLevel = Number((totalScore - requiredScoreForCurrentLevel)) / Number((requiredScoreForNextLevel - requiredScoreForCurrentLevel));
    
    return {
        name: playerName,
        pp,
        accuracy: acc,
        level,
        percentToNextLevel,
        totalScore,
        totalPPScores: ppScores.length
    }
}

function calculatePPScores(beatmapScores: BeatmapScores[], playerName: string): PPScore {
    let totalScore = 0n;
    let allPPScores: Score[] = [];

    for (const beatmap of beatmapScores) {
        let saneScores: Score[] = [];
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

    return {ppScores: sortppScores, totalScore};
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