const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/vuaxoso').then(async () => {
  const Draw = mongoose.connection.collection('draws');
  const Game = mongoose.connection.collection('games');
  const mtGame = await Game.findOne({ code: 'MT' });
  if (mtGame) {
    const draws = await Draw.find({ game: mtGame._id }).limit(2).toArray();
    console.log(JSON.stringify(draws, null, 2));
  }
  process.exit(0);
});
