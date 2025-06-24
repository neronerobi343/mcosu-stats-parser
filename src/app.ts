import fs from "fs/promises";
import { ScoresDbParser } from "./ScoresParser";
import { calculatePlayerStats, calculatePPScores, getRecentScores, getTopScores } from "./playerStats";

async function main() {
    try {
        console.time("✅ SCORE PARSING COMPLETE");
        const { scoresDbPath, playerName, outputJsonPath, osuApiKey, 
            parseTopScores, parseRecentScores, 
            amountTopScores, amountRecentScores, 
            countRelaxScores, countAutopilotScores } = JSON.parse(await fs.readFile("settings.json", "utf8"));
        if (playerName === "") throw new Error("Player name is empty.");
        if (osuApiKey === "" && (parseTopScores || parseRecentScores)) throw new Error("getTopScores or getRecentScores was requested in settings.json, but osu! API key is not provided.");

        const scoreBuffer = await fs.readFile(scoresDbPath);
        const sp = new ScoresDbParser(scoreBuffer);
        let outputObj: {[key: string]: any} = {};
        sp.parse();
        console.log("Parsing valid scores...");
        const ppScores = calculatePPScores(sp.beatmapScores, playerName, countRelaxScores, countAutopilotScores);

        console.log("Parsing player stats...");
        const stats = calculatePlayerStats(ppScores, playerName);
        outputObj.playerStats = stats;


        if (parseTopScores){
            console.log("Parsing top scores...");
            console.time("Top scores parsed");
            const topScores = await getTopScores(ppScores, amountTopScores, osuApiKey)
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

        await fs.writeFile(outputJsonPath, JSON.stringify(outputObj, null, 2));
        console.timeEnd("✅ SCORE PARSING COMPLETE");
        console.log(`Output written to ${outputJsonPath}`);
    } catch(err) {
        console.log(err);
        console.log("❌ SCORE PARSING FAILED");
    }
}

main();