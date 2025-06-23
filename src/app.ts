import fs from "fs/promises";
import { ScoresDbParser } from "./ScoresParser";
import { calculatePlayerStats } from "./playerStats";

async function main() {
    try {
        console.time("✅ SCORE PARSING COMPLETE");
        const { scoresDbPath, playerName, outputJsonPath } = JSON.parse(await fs.readFile("settings.json", "utf8"));
        if (playerName === "") throw new Error("Player name is empty.");

        const scoreBuffer = await fs.readFile(scoresDbPath);
        const sp = new ScoresDbParser(scoreBuffer);
        sp.parse();
        const stats = calculatePlayerStats(sp.beatmapScores, playerName);
        await fs.writeFile(outputJsonPath, JSON.stringify(stats, (key, value) => {
            if (typeof value === 'bigint') {
                const valStr = value.toString();
                return valStr.substring(0, valStr.length - 1)
            }
            return value;}, 2
        ));
        console.timeEnd("✅ SCORE PARSING COMPLETE");
        console.log(`Output written to ${outputJsonPath}`);
    } catch(err) {
        console.log(err);
        console.log("❌ SCORE PARSING FAILED");
    }
}

main();