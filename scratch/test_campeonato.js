const { getCurrentRound } = require('campeonato-brasileiro-api');
getCurrentRound('a').then(res => {
  console.log("Matches:", JSON.stringify(res.rounds[0].matches.slice(0, 2), null, 2));
}).catch(err => {
  console.error(err);
});
