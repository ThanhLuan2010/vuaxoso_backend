const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/vuaxoso').then(async () => {
  const Game = mongoose.connection.collection('games');
  const game = await Game.findOne({ _id: new mongoose.Types.ObjectId('6a53b881465404ead0e1b6e7') });
  console.log(JSON.stringify(game, null, 2));
  process.exit(0);
});
