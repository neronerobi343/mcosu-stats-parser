# McOsu Player Stats Parser

This tool is for parsing the `scores.db` from a McOsu installation to get basic player stats (like pp, accuracy, level, etc.) and optionally their top scores and recent scores.

## Overview
After parsing, the tool returns a JSON file with the following:
- `playerStats` object with attributes: 
    - username
    - pp
    - accuracy
    - level
    - percentToNextLevel
    - totalScore
    - totalPPScores (i.e. number of scores that are taken into account in the PP calculation)
- **Optional:** `topScores` and `recentScores` arrays, with scores that have the attributes:
    - beatmapSetId: a string used to get the beatmap set at `https://osu.ppy.sh/beatmapsets/beatmapSetId`
    - beatmapName
    - artist
    - difficultyName
    - date
    - mods: an array of strings with the mods in two letter abbreviations
        - e.g. `[ "EZ", "DT" ]`
    - accuracy
    - weight
    - rawPP
    - weightPP
    - speedMultiplier
    
Refer to `exampleStats.json` to see an output sample.

## Usage

Make sure the latest LTS version of Node is installed.

### Execution
1. `git clone https://github.com/neronerobi343/mcosu-player-stats-calculator.git`
2. `cd mcosu-player-stats-calculator && node app.js`

### Settings
Modify `settings.json` to change the settings of the tool.

- `"scoresDbPath"`: the path to the `scores.db` file.
    - Default is `"C:/Program Files (x86)/Steam/steamapps/common/McOsu/scores.db"`, which is standard if McOsu is downloaded from Steam on a Windows machine.
- `"playerName"`: username that matches an existing profile in McOsu,
- `"outputJsonPath"`: path to the output JSON 
    - make sure that the filename itself (e.g. `playerStats.json`) is included in the path.
- `"osuApiKey"`: more details on how to get a personal API key [here](https://github.com/ppy/osu-api/wiki).
- `"parseTopScores"`, `"parseRecentScores"`: setting these to `true` will enable parsing (this will _not_ work if there's no API key provided).
- `"amountTopScores"`, `"amountRecentScores"`: determines how many scores to parse for their respective category.
- `"countRelaxScores"`, `"countAutopilotScores"`: tells the parser whether or not to count scores with Relax or Autopilot in the PP calculation for player stats.


## Notes
- This will _not_ work with `scores.db` from osu!stable, as the McOsu format is slightly different.
- When parsing top plays and recent scores from `scores.db`, if the score is set on a map that's not submitted to osu!'s beatmap listings, it'll skip it.
- Use the top/recent score parsing at your discretion, as there's a rate limit to the osu! API.
    - There's a 250ms delay between each `fetch` call to the API to prevent overloading, but regardless,  parsing too many top/recent scores (>100) is not recommended.

## Credits
- [McOsu repo](https://github.com/McKay42/McOsu) for referencing all the parsing and calculations.
