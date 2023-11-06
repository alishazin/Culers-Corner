
module.exports = {initialize: initializeEndpoints};

require('dotenv').config()
const request = require("request");
const datetimeUtils = require("../../utils/datetime.js");
const footballUtils = require("../../utils/football.js");

function initializeEndpoints(app) {
    fixturesEndpoint(app);
    fixtureSpecificEndpoint(app);
}

function fixturesEndpoint(app) {

    app.get("/api/fixtures", (req, res) => {
        
        const { lastDate, currentSeason } = req.query

        let fromDate;
        let toDate;
        if (lastDate === undefined) {
            fromDate = new Date().getTime() - 2629800000; // 2629800000 1 month in milliseconds
            toDate = new Date().getTime() + 2629800000;
            
            fromDate = new Date(fromDate);
            toDate = new Date(toDate);
    
            fromDate =  datetimeUtils.dateObjToHyphenFormat(fromDate);
            toDate =  datetimeUtils.dateObjToHyphenFormat(toDate);
        } else {
            if (new Date(lastDate.replaceAll("-", "/")).getTime() > new Date().getTime()) {
                fromDate = datetimeUtils.dateObjToHyphenFormat(new Date(new Date(lastDate.replaceAll("-", "/")).getTime() + 86400000)); // 86,400,000 24 hrs
                toDate = datetimeUtils.dateObjToHyphenFormat(new Date(new Date(lastDate.replaceAll("-", "/")).getTime() + 86400000 + (2629800000 * 2)));
            } else {
                fromDate = datetimeUtils.dateObjToHyphenFormat(new Date(new Date(lastDate.replaceAll("-", "/")).getTime() - 86400000 - (2629800000 * 2))); // 86,400,000 24 hrs
                toDate = datetimeUtils.dateObjToHyphenFormat(new Date(new Date(lastDate.replaceAll("-", "/")).getTime() - 86400000));
            }
        }

        
        var options = {
            method: 'GET',
            url: 'https://v3.football.api-sports.io/fixtures',
            qs: {
                season: currentSeason,
                team: 529,
                from: fromDate,
                to: toDate,
                timezone: "Asia/Kolkata"
            },
            headers: {
              'x-rapidapi-host': 'v3.football.api-sports.io',
              'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            }
        };
          
        request(options, function (error, response, body) {
            if (error) throw new Error(error);

            const apiResponseBody = JSON.parse(body)
            
            if (response.statusCode !== 200 || !(Array.isArray(apiResponseBody.errors) && apiResponseBody.errors.length === 0)) {
                return res.status(400).send(apiResponseBody.errors)
            }

            let sendBackData = {
                from: fromDate,
                to: toDate,
                fixtures: []
            };
    
            const allTimestamps = [];
    
            for (let apiFixture of apiResponseBody.response) {
    
                const fixtureDatetime = new Date(apiFixture.fixture.date);
                const dateRelative = datetimeUtils.getDateRelativeTerm(new Date(apiFixture.fixture.date))
    
                if (allTimestamps.includes(apiFixture.fixture.timestamp)) continue;
                else allTimestamps.push(apiFixture.fixture.timestamp);

                const dateStringSplitted = fixtureDatetime.toDateString().split(" ")
    
                sendBackData.fixtures.push({
                    "timestamp": apiFixture.fixture.timestamp,
                    "fixture_id": apiFixture.fixture.id,
                    "timeshort": (() => {
                        if (["FT", "AET", "PEN", "PST", "SUSP", "CANC", "ABD", "AWD", "WO"].includes(apiFixture.fixture.status.short?.toUpperCase())) 
                            return "past"; 
                        else if (["1H", "HT", "2H", "ET", "BT", "P", "INT"].includes(apiFixture.fixture.status.short?.toUpperCase())) 
                            return "present"; 
                        else if (["TBD", "NS"].includes(apiFixture.fixture.status.short?.toUpperCase())) 
                            return "future";
                    })(),
                    "status": (() => {
                        if (["PST", "SUSP", "CANC", "ABD", "AWD", "WO"].includes(apiFixture.fixture.status.short?.toUpperCase()))
                            return "draw"
                        else if (apiFixture.teams.home.winner === null) 
                            return "draw"
                        else if ((apiFixture.teams.home.id === 529 && apiFixture.teams.home.winner) || (apiFixture.teams.away.id === 529 && apiFixture.teams.away.winner))
                            return "win"
                        else 
                            return "lose"
                    })(),
                    "league": {
                        "name": apiFixture.league.name,
                        "logo": apiFixture.league.logo,
                    },
                    "datetime": {
                        "readable_date": dateRelative === null ? `${dateStringSplitted[0]}, ${dateStringSplitted[2]} ${dateStringSplitted[1]} ${dateStringSplitted[3]}` : dateRelative,
                        "date": datetimeUtils.addZeroToLeftToDateString(fixtureDatetime.toLocaleDateString().replaceAll("/", "-")),
                        "time": [datetimeUtils.addZeroToLeft(fixtureDatetime.getHours()), datetimeUtils.addZeroToLeft(fixtureDatetime.getMinutes())]
                    },
                    "score": apiFixture.fixture.status,
                    "home": {
                        name: apiFixture.teams.home.name, 
                        logo: apiFixture.teams.home.logo, 
                        score: apiFixture.goals.home == null ? 0 : apiFixture.goals.home, 
                    },
                    "away": {
                        name: apiFixture.teams.away.name, 
                        logo: apiFixture.teams.away.logo, 
                        score: apiFixture.goals.away == null ? 0 : apiFixture.goals.away, 
                    },
                })
            }
    
            // Sorting based on timestamp
            sendBackData.fixtures = sendBackData.fixtures.sort(
                (objA, objB) => Number(objA.timestamp) - Number(objB.timestamp),
            );
    
            res.send(sendBackData);
        }); 
        
    })

}

function fixtureSpecificEndpoint(app) {
    app.get("/api/fixture/:id", (req, res) => {
        
        const { id } = req.params;

        var options = {
            method: 'GET',
            url: 'https://v3.football.api-sports.io/fixtures',
            qs: {
                id: id,
                timezone: "Asia/Kolkata"
            },
            headers: {
              'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            }
        };
          
        request(options, async function (error, response, body) {
            if (error) throw new Error(error);
        
            let responseUntouched = JSON.parse(body)
            if (response.statusCode !== 200 || !(Array.isArray(responseUntouched.errors) && responseUntouched.errors.length === 0)) {
                res.status(400).send(responseUntouched.errors);
            } else if (responseUntouched.response.length == 0) {
                res.status(400).send("Invalid Fixture Id");
            } else {

                apiResponseBody = responseUntouched.response[0]

                let responseData = {
                    scoreboardData: {},
                    eventsData: [],
                    lineupData: null,
                    statisticsData: null,
                    allPlayersData: null,
                    extraInfo: {}
                }
    
                responseData.scoreboardData = {
                    timeshort: (() => {
                        if (["FT", "AET", "PEN", "PST", "SUSP", "CANC", "ABD", "AWD", "WO"].includes(apiResponseBody.fixture.status.short?.toUpperCase())) 
                            return "past"; 
                        else if (["1H", "HT", "2H", "ET", "BT", "P", "INT"].includes(apiResponseBody.fixture.status.short?.toUpperCase())) 
                            return "present"; 
                        else if (["TBD", "NS"].includes(apiResponseBody.fixture.status.short?.toUpperCase())) 
                            return "future";
                    })(),
                    league: {
                        name: apiResponseBody.league?.name,
                    },
                    score: apiResponseBody.fixture.status,
                    home: {
                        name: apiResponseBody.teams.home.name,
                        logo: apiResponseBody.teams.home.logo,
                        score: apiResponseBody.goals.home,
                    },
                    away: {
                        name: apiResponseBody.teams.away.name,
                        logo: apiResponseBody.teams.away.logo,
                        score: apiResponseBody.goals.away,
                    },
                }

                // if (responseData.scoreboardData.timeshort === "present") {
                if (apiResponseBody.players.length > 0 && (recognizeEventsBehavior(apiResponseBody.players[0].players, apiResponseBody.events) === "live-mode" || recognizeEventsBehavior(apiResponseBody.players[1].players, apiResponseBody.events) === "live-mode")) {
                    responseData.eventsData = swapEventsDataForLiveMode(apiResponseBody.events)
                } else {
                    responseData.eventsData = apiResponseBody.events
                }

                if (responseData.scoreboardData.timeshort === "live") {
                    responseData.eventsData?.reverse()
                }

                responseData.lineupData = getFixtureLineup(responseUntouched)
                responseData.statisticsData = getFixtureStatistics(responseUntouched)
                responseData.allPlayersData = getAllPlayersData(responseUntouched)
                
                responseData.extraInfo = {
                    referee: apiResponseBody.fixture.referee,
                    venue: apiResponseBody.fixture.venue,
                    recent: null,
                    h2h: null
                }

                if (responseData.scoreboardData.timeshort === "future") {
                    responseData = await getRecentAndH2hForm(
                        apiResponseBody.teams.home.id,
                        apiResponseBody.teams.away.id,
                        apiResponseBody.league.id,
                        responseData
                    )
                }

                res.status(200).send(responseData)

            }

        })


        
    })
}

const getAllPlayersData = (apiResponseBody) => {

    const convertNull = (value) => {
        if (value === null) return 0
        return value
    }

    const getAccuracy = (value, total) => {
        return Math.round((Number(value) * 100) / Number(total))
    }

    const getRatingComment = (rating) => {
        if (rating === null) return null
        else {
            rating = Number(rating)
            if (rating > 7.5) return "good"
            else if (rating > 6) return "avg"
            return "bad"
        }
    }

    const getPassingAccuracyComment = (accuracy) => {
        if (accuracy > 75) return "good"
        else if (accuracy > 50) return "avg"
        return "bad"
    }

    const getShotAccuracyComment = (accuracy) => {
        if (accuracy > 70) return "good"
        else if (accuracy > 40) return "avg"
        return "bad"
    }

    const getDribbleSuccessRateComment = (accuracy) => {
        if (accuracy > 70) return "good"
        else if (accuracy > 40) return "avg"
        return "bad"
    }

    const getDuelsSuccessRateComment = (accuracy) => {
        if (accuracy > 70) return "good"
        else if (accuracy > 40) return "avg"
        return "bad"
    }

    apiResponseBody = apiResponseBody.response[0]
    if (apiResponseBody.players.length === 0) return null

    const getTeamPlayersData = (teamPlayersData) => {

        const returnData = []

        for (let playerObj of teamPlayersData) {

            const positionShort = playerObj.statistics[0].games.position
            const rating = playerObj.statistics[0].games.rating
            const totalPasses = convertNull(playerObj.statistics[0].passes.total)
            const accuratePasses = convertNull(playerObj.statistics[0].passes.accuracy)
            const passingAccuracy = getAccuracy(accuratePasses, totalPasses)
            const totalShots = convertNull(playerObj.statistics[0].shots.total)
            const shotsOnTarget = convertNull(playerObj.statistics[0].shots.on)
            const shotsAccuracy = getAccuracy(shotsOnTarget, totalShots)
            const dribblesAttempted = convertNull(playerObj.statistics[0].dribbles.attempts)
            const dribblesSuccess = convertNull(playerObj.statistics[0].dribbles.success)
            const dribblesSuccessRate = getAccuracy(dribblesSuccess, dribblesAttempted)
            const totalDuels = convertNull(playerObj.statistics[0].duels.total)
            const duelsWon = convertNull(playerObj.statistics[0].duels.won)
            const duelsSuccessRate = getAccuracy(duelsWon, totalDuels)
            
            if (positionShort === "G") {

                returnData.push({
                    details: {
                        name: playerObj.player.name,
                        number: playerObj.statistics[0].games.number,
                        photo: playerObj.player.photo,
                        position: footballUtils.positionFullForm[positionShort],
                        isCaptain: playerObj.statistics[0].games.captain
                    },
                    stats: [
                        [
                            {type: "row", key: "minuted played", value: convertNull(playerObj.statistics[0].games.minutes)},
                            {type: "row", key: "rating", value: rating, comment: rating === null ? "" :getRatingComment(convertNull(rating))},
                            {type: "row", key: "saves", value: convertNull(playerObj.statistics[0].goals.saves), comment: ""},
                            {type: "row", key: "goals conceded", value: convertNull(playerObj.statistics[0].goals.conceded), comment: ""},
                            {type: "row", key: "assists", value: convertNull(playerObj.statistics[0].goals.assists), comment: ""},
                            {type: "row", key: "goals scored", value: convertNull(playerObj.statistics[0].goals.total), comment: ""},
                        ],
                        [
                            {type: "header", value: "passes"},
                            {type: "row", key: "total passes", value: totalPasses, comment: ""},
                            {type: "row", key: "key passes", value: convertNull(playerObj.statistics[0].passes.key), comment: ""},
                            {type: "row", key: "accurate passes", value: accuratePasses, comment: ""},
                            {type: "row", key: "passing accuracy", value: playerObj.statistics[0].passes.total === null ? null : `${passingAccuracy}%`, comment: playerObj.statistics[0].passes.total === null ? null : getPassingAccuracyComment(passingAccuracy)},
                        ],
                        [
                            {type: "header", value: "fouls"},
                            {type: "row", key: "fouls drawn", value: convertNull(playerObj.statistics[0].fouls.drawn), comment: ""},
                            {type: "row", key: "fouls commited", value: convertNull(playerObj.statistics[0].fouls.committed), comment: ""},
                        ],
                        [    
                            {type: "header", value: "cards"},
                            {type: "row", key: "yellow cards", value: convertNull(playerObj.statistics[0].cards.yellow), comment: ""},
                            {type: "row", key: "red cards", value: convertNull(playerObj.statistics[0].cards.red), comment: ""},
                        ],
                        [    
                            {type: "header", value: "penalty"},
                            {type: "row", key: "penalty saved", value: convertNull(playerObj.statistics[0].penalty.saved), comment: ""},
                            {type: "row", key: "penalty scored", value: convertNull(playerObj.statistics[0].penalty.scored), comment: ""},
                            {type: "row", key: "penalty missed", value: convertNull(playerObj.statistics[0].penalty.missed), comment: ""},
                        ],
                        [
                            {type: "header", value: "other"},
                            {type: "row", key: "penalty won", value: convertNull(playerObj.statistics[0].penalty.won), comment: ""},
                            {type: "row", key: "penalty conceded", value: convertNull(playerObj.statistics[0].penalty.commited), comment: ""},
                        ]
                    ]
                })
                
            } else {
                
                returnData.push({
                    details: {
                        name: playerObj.player.name,
                        number: playerObj.statistics[0].games.number,
                        photo: playerObj.player.photo,
                        position: footballUtils.positionFullForm[positionShort],
                        isCaptain: playerObj.statistics[0].games.captain
                    },
                    stats: [
                        [
                            {type: "row", key: "minuted played", value: convertNull(playerObj.statistics[0].games.minutes)},
                            {type: "row", key: "rating", value: rating, comment: rating === null ? "" :getRatingComment(convertNull(rating))},
                            {type: "row", key: "goals scored", value: convertNull(playerObj.statistics[0].goals.total), comment: ""},
                            {type: "row", key: "assists", value: convertNull(playerObj.statistics[0].goals.assists), comment: ""},
                        ],
                        [
                            {type: "header", value: "shots"},
                            {type: "row", key: "total shots", value: totalShots, comment: ""},
                            {type: "row", key: "shots on target", value: shotsOnTarget, comment: ""},               
                            {type: "row", key: "shot accuracy", value: playerObj.statistics[0].shots.total === null ? null : `${shotsAccuracy}%`, comment: playerObj.statistics[0].shots.total === null ? null : getShotAccuracyComment(shotsAccuracy)}               
                        ],
                        [
                            {type: "header", value: "passes"},
                            {type: "row", key: "total passes", value: totalPasses, comment: ""},
                            {type: "row", key: "key passes", value: convertNull(playerObj.statistics[0].passes.key), comment: ""},
                            {type: "row", key: "accurate passes", value: accuratePasses, comment: ""},
                            {type: "row", key: "passing accuracy", value: playerObj.statistics[0].passes.total === null ? null : `${passingAccuracy}%`, comment: playerObj.statistics[0].passes.total === null ? null : getPassingAccuracyComment(passingAccuracy)},
                        ],
                        [
                            {type: "header", value: "dribbles"},
                            {type: "row", key: "attempted", value: dribblesAttempted, comment: ""},
                            {type: "row", key: "successfull", value: dribblesSuccess, comment: ""},
                            {type: "row", key: "success rate", value: playerObj.statistics[0].dribbles.attempts === null ? null : `${dribblesSuccessRate}%`, comment: playerObj.statistics[0].dribbles.attempts === null ? null : getDribbleSuccessRateComment(dribblesSuccessRate)},
                        ],
                        [
                            {type: "header", value: "duels"},
                            {type: "row", key: "total duels", value: totalDuels, comment: ""},
                            {type: "row", key: "duels won", value: duelsWon, comment: ""},
                            {type: "row", key: "success rate", value: playerObj.statistics[0].duels.total === null ? null : `${duelsSuccessRate}%`, comment: playerObj.statistics[0].duels.total === null ? null : getDuelsSuccessRateComment(duelsSuccessRate)},
                        ],
                        [
                            {type: "header", value: "tackles"},
                            {type: "row", key: "tackles", value: convertNull(playerObj.statistics[0].tackles.total), comment: ""},
                            {type: "row", key: "blocks", value: convertNull(playerObj.statistics[0].tackles.blocks), comment: ""},
                            {type: "row", key: "interceptions", value: convertNull(playerObj.statistics[0].tackles.interceptions), comment: ""},
                        ],
                        [
                            {type: "header", value: "fouls"},
                            {type: "row", key: "fouls drawn", value: convertNull(playerObj.statistics[0].fouls.drawn), comment: ""},
                            {type: "row", key: "fouls commited", value: convertNull(playerObj.statistics[0].fouls.committed), comment: ""},
                        ],
                        [    
                            {type: "header", value: "cards"},
                            {type: "row", key: "yellow cards", value: convertNull(playerObj.statistics[0].cards.yellow), comment: ""},
                            {type: "row", key: "red cards", value: convertNull(playerObj.statistics[0].cards.red), comment: ""},
                        ],
                        [
                            {type: "header", value: "other"},
                            {type: "row", key: "offsides", value: convertNull(playerObj.statistics[0].offsides), comment: ""},
                            {type: "row", key: "penalty won", value: convertNull(playerObj.statistics[0].penalty.won), comment: ""},
                            {type: "row", key: "penalty conceded", value: convertNull(playerObj.statistics[0].penalty.commited), comment: ""},
                        ],
                        [    
                            {type: "header", value: "penalty"},
                            {type: "row", key: "penalty scored", value: convertNull(playerObj.statistics[0].penalty.scored), comment: ""},
                            {type: "row", key: "penalty missed", value: convertNull(playerObj.statistics[0].penalty.missed), comment: ""},
                        ],
                    ]
                })

            }

        }

        return returnData

    }

    return {
        home: getTeamPlayersData(apiResponseBody.players[0].players),
        away: getTeamPlayersData(apiResponseBody.players[1].players)
    }

}

const swapEventsDataForLiveMode = (eventsData) => {
    for (let eventObj of eventsData) {
        if (eventObj.type.toLowerCase() === "subst") {
            let temp = eventObj.player
            eventObj.player = eventObj.assist
            eventObj.assist = temp
        }
    }

    return eventsData
}

const recognizeEventsBehavior = (playersData, eventsData) => {
    
    for (let playerObj of playersData) {
        if (playerObj.statistics[0].games.substitute) {
            if (playerObj.statistics[0].games.minutes !== null) {
                const eventObj = getSubEvent(playerObj.player.id, eventsData)
                if (eventObj == undefined) {
                    return "live-mode"
                } else {
                    return "post-mode"
                }
            }
        }
    }

}

const getRecentAndH2hForm = async (homeId, awayId, leagueId, responseData) => {

    const getRecentFormSeasons = async (teamId, leagueId) => {
        return new Promise(async (resolve, reject) => {
            const allForms = []
    
            let currentSeason = 2023
            let flag = 0
    
            while (true) {
                let response = await getRecentForm(teamId, leagueId, currentSeason)
                
                if (response.length === 0) {
                    if (flag === 1) {
                        resolve(allForms)
                        break;
                    }
                    
                    flag = 1
                    currentSeason = currentSeason - 1

                } else {
                    flag = 0
                    allForms.push(...response)
                    if (allForms.length >= 5) {
                        resolve(allForms.slice(0, 5))
                        break
                    }
                    currentSeason = currentSeason - 1
                }
            }
        })
        
    }

    const getRecentForm = async (teamId, leagueId, season) => {
        return new Promise((resolve, reject) => { 
            var options = {
                method: 'GET',
                url: 'https://v3.football.api-sports.io/teams/statistics',
                qs: {
                    season: season,
                    team: teamId,
                    league: leagueId,
                },
                headers: {
                  'x-rapidapi-host': 'v3.football.api-sports.io',
                  'x-rapidapi-key': process.env.RAPIDAPI_KEY,
                }
            };
              
            request(options, function (error, response, body) {
                if (error) throw new Error(error);
                
                const apiResponseBody = JSON.parse(body)

                const form = apiResponseBody.response.form.split("")
                form.reverse()

                resolve(form)
            })
        })
    }

    const getLast2SeasonH2H = async (homeId, awayId) => {
        return new Promise(async (resolve, reject) => {
            let allH2H = []

            let currentSeason = 2023
            
            for (let i=0; i<2; i++) {
                let response = await getRecentH2H(homeId, awayId, currentSeason)
                allH2H.push(...response);
                currentSeason = currentSeason - 1
            }

            // Sorting based on timestamp
            allH2H = allH2H.sort(
                (objA, objB) => Number(objB.timestamp) - Number(objA.timestamp),
            );

            resolve(allH2H)
        })
    }

    const getRecentH2H = async (homeId, awayId, season) => {
        return new Promise((resolve, reject) => {   
            var options = {
                method: 'GET',
                url: 'https://v3.football.api-sports.io/fixtures/headtohead',
                qs: {
                    season: season,
                    h2h: `${homeId}-${awayId}`,
                },
                headers: {
                  'x-rapidapi-host': 'v3.football.api-sports.io',
                  'x-rapidapi-key': process.env.RAPIDAPI_KEY,
                }
            };
              
            request(options, function (error, response, body) {
                if (error) throw new Error(error);
                
                const apiResponseBody = JSON.parse(body)

                const responseData = []
                for (let fixtureObj of apiResponseBody.response) {

                    if (["TBD", "NS"].includes(fixtureObj.fixture.status.short.toUpperCase())) {
                        continue;
                    }

                    responseData.push({
                        home: {
                            name: fixtureObj.teams.home.name,
                            logo: fixtureObj.teams.home.logo,
                            score: fixtureObj.goals.home
                        },
                        away: {
                            name: fixtureObj.teams.away.name,
                            logo: fixtureObj.teams.away.logo,
                            score: fixtureObj.goals.away
                        },
                        timestamp: new Date(fixtureObj.fixture.date),
                        date: datetimeUtils.dateObjToHyphenFormat2(new Date(fixtureObj.fixture.date)),
                        league_name: fixtureObj.league.name
                    })
                }

                resolve(responseData)
            })
        })
    }

    const allPromise = Promise.all([await getRecentFormSeasons(homeId, leagueId), await getRecentFormSeasons(awayId, leagueId), await getLast2SeasonH2H(homeId, awayId)])
    
    try {
        const [homeForm, awayForm, H2H] = await allPromise;
        responseData.extraInfo.recent = {
            home: homeForm,
            away: awayForm
        }
        responseData.extraInfo.h2h = H2H

        return responseData
    } catch (error) {
        console.log(error);
    }

}

const getSubEvent = (playerInId, eventsData) => {
        
    for (let eventObj of eventsData) {
        if (eventObj.type === "subst" && eventObj.assist.id === playerInId) return eventObj
    }

}

const getFixtureLineup = (apiResponseBody) => {

    const getPlayerFromPlayers = (searchId, playersData) => {
        
        for (let playerObj of playersData) {
            if (playerObj.player.id === searchId) return playerObj
        }

    }

    const formatStartXI = (lineupData, playersData) => {
        const returnData = [];

        let rowData = [];
        for (let playerObj of lineupData) {

            const gridRow = Number(playerObj.player.grid.split(":")[0])
            const currentObj = {}

            let playerObjFromPlayers
            if (playersData.length === 0) {
                playerObjFromPlayers = null
            } else {
                playerObjFromPlayers = getPlayerFromPlayers(playerObj.player.id, playersData)
            }

            currentObj.name = playerObj.player.name
            currentObj.number = playerObj.player.number
            currentObj.img = playerObjFromPlayers === null ? `https://media.api-sports.io/football/players/${playerObj.player.id}.png` : playerObjFromPlayers.player.photo
            currentObj.rating = playerObjFromPlayers === null ? null : Number(playerObjFromPlayers.statistics[0].games.rating)
            
            if (gridRow === returnData.length + 1) {
            } else if (gridRow > returnData.length + 1) {
                returnData.push(rowData)
                rowData = []                
            }
            rowData.push(currentObj)
            
        }
        returnData.push(rowData)

        return returnData
    }

    const getSubsAndBenchFromPlayers = (playersData, eventsData, substitutesData) => {
        
        const subsData = []
        const benchData = []

        if (playersData.length == 0) {

            for (let playerObj of substitutesData) {
                benchData.push({
                    name: playerObj.player.name,
                    img: `https://media.api-sports.io/football/players/${playerObj.player.id}.png`,
                    number: playerObj.player.number,
                    pos: footballUtils.positionFullForm[playerObj.player.number]
                })
            }

        } else {
            
            for (let playerObj of playersData) {
                
                if (playerObj.statistics[0].games.substitute) {
                    if (playerObj.statistics[0].games.minutes === null) {
                        benchData.push({
                            name: playerObj.player.name,
                            img: playerObj.player.photo,
                            number: playerObj.statistics[0].games.number,
                            pos: footballUtils.positionFullForm[playerObj.statistics[0].games.position]
                        })
                    } else {
    
                        const eventObj = getSubEvent(playerObj.player.id, eventsData)
                        if (eventObj == undefined) continue
                        const outPlayer = getPlayerFromPlayers(eventObj.player.id, playersData);
                        
                        if (!outPlayer) continue;
    
                        subsData.push({
                            inPlayer: {
                                img: playerObj.player.photo,
                                name: playerObj.player.name,
                                number: playerObj.statistics[0].games.number,
                                rating: playerObj.statistics[0].games.rating,
                            },
                            outPlayer: {
                                name: eventObj.player.name,
                                number: outPlayer.statistics[0].games.number,
                            },
                            time: eventObj.time.elapsed
                        })
                    }
                }
    
            }
        }

        return {subs: subsData, bench: benchData}

    }

    apiResponseBody = apiResponseBody.response[0]

    if (apiResponseBody.lineups.length === 0) return null

    const homeSubsAndBench = getSubsAndBenchFromPlayers(apiResponseBody.players.length !== 0 ? apiResponseBody.players[0].players : [], apiResponseBody.events, apiResponseBody.lineups[0].substitutes)
    const awaySubsAndBench = getSubsAndBenchFromPlayers(apiResponseBody.players.length !== 0 ? apiResponseBody.players[1].players : [], apiResponseBody.events, apiResponseBody.lineups[0].substitutes)

    const lineupData = {
        home : {
            coach : apiResponseBody.lineups[0].coach,
            formation: apiResponseBody.lineups[0].formation,
            startXI: formatStartXI(apiResponseBody.lineups[0].startXI, apiResponseBody.players.length !== 0 ? apiResponseBody.players[0].players : []),
            subs: homeSubsAndBench.subs,
            bench: homeSubsAndBench.bench
        },
        away : {
            coach : apiResponseBody.lineups[1].coach,
            formation: apiResponseBody.lineups[1].formation,
            startXI: formatStartXI(apiResponseBody.lineups[1].startXI, apiResponseBody.players.length !== 0 ? apiResponseBody.players[1].players : []),
            subs: awaySubsAndBench.subs,
            bench: awaySubsAndBench.bench
        },
    };

    return lineupData

}

const getFixtureStatistics = (apiResponseBody) => {

    const getHigher = (valHome, valAway) => {
        if (valHome === null) val1 = 0 
        if (valAway === null) val2 = 0 

        if (valHome == valAway) return null
        else if (valHome > valAway) return 0
        else if (valHome < valAway) return 1
    }

    const removePercent = (value) => {
        if (value === null || value === undefined) return 0
        return Number(value.slice(0, value.length - 1))
    }

    const nullToZero = (value) => {
        if (value === null || value === undefined) return 0
        return Number(value)
    }

    apiResponseBody = apiResponseBody.response[0]

    if (apiResponseBody.statistics.length === 0) {
        return null
    }

    let statisticsData = []

    statisticsData.push({
        type: "Goals", 
        home: apiResponseBody.goals.home, 
        away: apiResponseBody.goals.away,
        higher: getHigher(apiResponseBody.goals.home, apiResponseBody.goals.away)
    })

    for (let i=0; i<apiResponseBody.statistics[0].statistics.length; i++) {
        
        const currentType = apiResponseBody.statistics[0].statistics[i].type
        const homeValue = apiResponseBody.statistics[0].statistics[i].value
        const awayValue = apiResponseBody.statistics[1].statistics[i].value

        if (["Ball Possession", "Passes %"].includes(currentType)) {
            statisticsData.push({
                type: currentType, 
                home: `${nullToZero(removePercent(homeValue))}%`, 
                away: `${nullToZero(removePercent(awayValue))}%`, 
                higher: getHigher(removePercent(homeValue), removePercent(awayValue))
            })
        } else if (currentType === "expected_goals") {
            statisticsData = [
                ...statisticsData.slice(0, 1),
                {
                    type: "xG", 
                    home: nullToZero(homeValue), 
                    away: nullToZero(awayValue), 
                    higher: getHigher(nullToZero(homeValue), nullToZero(awayValue))
                },
                ...statisticsData.slice(1)
            ];
        } else {
            statisticsData.push({
                type: currentType, 
                home: nullToZero(homeValue), 
                away: nullToZero(awayValue), 
                higher: getHigher(nullToZero(homeValue), nullToZero(awayValue))
            })
        }
    }

    return statisticsData

}