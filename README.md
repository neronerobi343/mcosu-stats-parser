# McOsu Player Stats Calculator

This tool is for parsing the `scores.db` from a McOsu installation and returns a JSON file with the following:
- username
- pp
- accuracy
- level
- percentToNextLevel
- totalScore
- totalPPScores (i.e. number of scores that are taken into account in the PP calculation)

## Usage

Make sure the latest LTS version of Node is installed.

### Execution
1. `git clone https://github.com/neronerobi343/mcosu-player-stats-calculator.git`
2. `cd mcosu-player-stats-calculator && node app.js`

### Settings
- `"scoresDbPath"`: the path to the `scores.db` file.
    - Default is `"C:/Program Files (x86)/Steam/steamapps/common/McOsu/scores.db"`, which is standard if McOsu is downloaded from Steam on a Windows machine.
- `"playerName"`: username that matches an existing profile in McOsu,
- `"outputJsonPath"`: path to the output JSON 
    - make sure that the filename itself (e.g. `playerStats.json`) is included in the path.

## Notes
- This will _not_ work with `scores.db` from osu!stable, as the McOsu format is slightly different.
- When parsing top plays and recent scores from `scores.db`, if the score is set on a map that's not submitted to osu!'s beatmap listings, it'll skip it.
    - Only really applies to maps that exist locally.

## Credits
- [McOsu](https://github.com/McKay42/McOsu) repo for referencing all the parsing and calculations.
