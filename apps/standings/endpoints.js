
module.exports = {initialize: initializeEndpoints};

require('dotenv').config()
const request = require("request");

const PLAYER_STANDINGS_THRESHOLD = 86400000 // In ms (1 day)

function initializeEndpoints(app, PlayerStandings) {
    standingsEndpoint(app, PlayerStandings);
}

function standingsEndpoint(app, PlayerStandings) {

    const getPlayerStandings = (instance, league, season) => {
        
        /*
            1. top scorers
            2. top assisters
            3. yellow cards
            4. red cards
        */

        const getEndpoint = {
            1: "topscorers",
            2: "topassists",
            3: "topyellowcards",
            4: "topredcards",
        }

        const getTitles = {
            1: "Top Scorers",
            2: "Top Assisters",
            3: "Yellow Cards",
            4: "Red Cards",
        }
        
        return new Promise((resolve) => {
          
            var options = {
                method: 'GET',
                url: `https://v3.football.api-sports.io/players/${getEndpoint[instance]}`,
                qs: {
                    season: season,
                    league: league,
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
    
                let returnData = {
                    title: getTitles[instance],
                    data: []
                }
    
                for (let playerObj of apiResponseBody.response) {
    
                    let playerData = [
                        playerObj.player.photo,
                        playerObj.player.name,
                        playerObj.statistics[0].team.name,
                    ]
    
                    if (instance === 1) playerData.push(playerObj.statistics[0].goals.total)
                    else if (instance === 2) playerData.push(playerObj.statistics[0].goals.assists)
                    else if (instance === 3) playerData.push(playerObj.statistics[0].cards.yellow)
                    else if (instance === 4) playerData.push(playerObj.statistics[0].cards.red)
    
                    returnData.data.push(playerData)
    
                }

                resolve(returnData)
    
            })

        })

    }

    app.get("/api/standings", (req, res) => {
        
        const { league, season } = req.query

        var options = {
            method: 'GET',
            url: 'https://v3.football.api-sports.io/standings',
            qs: {
                season: season,
                league: league,
            },
            headers: {
              'x-rapidapi-host': 'v3.football.api-sports.io',
              'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            }
        };
          
        request(options, async function (error, response, body) {
            if (error) throw new Error(error);

            const apiResponseBody = JSON.parse(body)
            
            if (response.statusCode !== 200 || !(Array.isArray(apiResponseBody.errors) && apiResponseBody.errors.length === 0)) {
                return res.status(400).send(apiResponseBody.errors)
            }

            let sendBackData = {
                teams: [],  
                players: []
            }

            for (let standingsObj of apiResponseBody.response.length > 0 ? apiResponseBody.response[0].league.standings : []) {

                let instanceData = {
                    group: null,
                    data: []
                }

                for (let teamObj of standingsObj) {

                    if (!instanceData.group) instanceData.group = teamObj.group

                    instanceData.data.push([
                        teamObj.rank, teamObj.team.logo, teamObj.team.name, teamObj.all.played,
                        `${teamObj.all.goals.for}:${teamObj.all.goals.against}`,
                        teamObj.goalsDiff, teamObj.points, teamObj.all.win, teamObj.all.draw, teamObj.all.lose, teamObj.form?.split('')
                    ])

                }

                sendBackData.teams.push(instanceData)

            }

            // Check if player stats exist in db
            const result = await PlayerStandings.findOne({league: league, season: season})

            if (result) {

                const timestampNow = new Date()

                if (timestampNow.getTime() - result.timestamp.getTime() < PLAYER_STANDINGS_THRESHOLD) {
                    sendBackData.players = result.data;
                    return res.send(sendBackData);
                }

                await PlayerStandings.findOneAndDelete({league: league, season: season})
                
            }
            
            Promise.all([getPlayerStandings(1, league, season), getPlayerStandings(2, league, season), getPlayerStandings(3, league, season), getPlayerStandings(4, league, season)]).then(async (returnValues) => {
                
                sendBackData.players.push(...returnValues);

                const obj = new PlayerStandings({
                    data: returnValues,
                    league: league,
                    season: season,
                    timestamp: new Date()
                })

                await obj.save()

                return res.send(sendBackData);

            })


        })

    })

}