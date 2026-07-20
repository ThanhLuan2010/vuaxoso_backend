const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/vuaxoso').then(async () => {
  const Draw = mongoose.connection.collection('draws');
  const Game = mongoose.connection.collection('games');
  const ktGames = await Game.find({ type: 'kienthiet' }).toArray();
  const ktIds = ktGames.map(g => g._id);
  
  const res = await Draw.deleteMany({ game: { $in: ktIds } });
  console.log(`Deleted ${res.deletedCount} old kienthiet draws`);
  process.exit(0);
});
