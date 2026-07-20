const drawNumbers = new Set([
  '31', '53', '57', '51',
  '69', '06', '50', '11',
  '15', '08', '29', '14',
  '68', '49', '40', '74',
  '38', '13', '80', '48'
]);

const board = { numbers: [ '08', '31' ], cost: 10000 };

let matchCount = 0;
board.numbers.forEach((numStr) => {
  if (drawNumbers.has(numStr)) matchCount++;
});

const bac = board.numbers.length;
let boardPrize = 0;

if (bac === 2 && matchCount === 2) boardPrize = 90000;

console.log('Match Count:', matchCount);
console.log('Bac:', bac);
console.log('Board Prize:', boardPrize);

let prizeAmount = 0;
if (boardPrize > 0) {
  const multiplier = Math.floor(board.cost / 10000);
  prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
}
console.log('Prize Amount:', prizeAmount);
