import Draw from '../models/Draw';
import Order from '../models/Order';
import User from '../models/User';
import Transaction from '../models/Transaction';
import Notification from '../models/Notification';
import Game from '../models/Game';

export const processDrawResults = async (drawId: string) => {
  try {
    const draw = await Draw.findById(drawId).populate('game');
    if (!draw || draw.status !== 'completed' || !draw.winningNumbers || draw.winningNumbers.length === 0) {
      console.log(`PrizeService: Kỳ quay ${drawId} chưa hoàn thành hoặc chưa có kết quả.`);
      return;
    }

    const game = draw.game as any;
    console.log(`PrizeService: Bắt đầu dò vé cho kỳ quay ${draw.drawCode} (Game: ${game.code})`);

    // Lấy các đơn hàng có drawId là ObjectId hoặc drawCode VÀ phải đúng gameType
    // Lấy cả 'pending' (chưa in) và 'completed' (đã in trên CMS) để dò vé
    let orderQuery: any = {
      $or: [{ drawId: draw._id.toString() }, { drawId: draw.drawCode }],
      status: { $in: ['pending', 'completed'] },
    };

    if (game.type === 'kienthiet') {
      orderQuery.gameType = { $regex: /^kienthiet_/ };
    } else {
      orderQuery.gameType = game.code;
    }

    let orders = await Order.find(orderQuery);
    
    // Chỉ xử lý những vé chưa được dò (chưa có winningNumbers)
    orders = orders.filter(o => !o.winningNumbers || o.winningNumbers.length === 0);
    console.log(`PrizeService: Tìm thấy ${orders.length} đơn hàng đang chờ dò vé.`);

    for (const order of orders) {
      let isWinner = false;
      let prizeAmount = 0;

      let allBoards: { numbers: string[], cost: number }[] = [];
      if (order.items && order.items.length > 0) {
        allBoards = order.items.map(item => ({ numbers: item.numbers, cost: item.cost }));
      } else if (order.numbers && order.numbers.length > 0) {
        allBoards = [{ numbers: order.numbers, cost: order.totalCost }];
      }

      // --- LOGIC DÒ VÉ CƠ BẢN (MVP) ---
      if (game.code === 'keno' || game.code === 'bao_keno') {
        const drawNumbers = new Set(draw.winningNumbers);
        allBoards.forEach((board) => {
          let matchCount = 0;
          board.numbers.forEach((numStr) => {
            if (drawNumbers.has(numStr)) matchCount++;
          });
          
          const bac = board.numbers.length;
          let boardPrize = 0;
          if (bac === 1 && matchCount === 1) boardPrize = 20000;
          else if (bac === 2 && matchCount === 2) boardPrize = 90000;
          else if (bac === 3) {
            if (matchCount === 2) boardPrize = 20000;
            if (matchCount === 3) boardPrize = 200000;
          } else if (bac === 4) {
            if (matchCount === 2) boardPrize = 10000;
            if (matchCount === 3) boardPrize = 50000;
            if (matchCount === 4) boardPrize = 400000;
          } else if (bac === 5) {
            if (matchCount === 3) boardPrize = 10000;
            if (matchCount === 4) boardPrize = 150000;
            if (matchCount === 5) boardPrize = 4400000;
          } else if (bac === 6) {
            if (matchCount === 3) boardPrize = 10000;
            if (matchCount === 4) boardPrize = 40000;
            if (matchCount === 5) boardPrize = 450000;
            if (matchCount === 6) boardPrize = 12500000;
          } else if (bac === 7) {
            if (matchCount === 3) boardPrize = 10000;
            if (matchCount === 4) boardPrize = 20000;
            if (matchCount === 5) boardPrize = 100000;
            if (matchCount === 6) boardPrize = 1200000;
            if (matchCount === 7) boardPrize = 40000000;
          } else if (bac === 8) {
            if (matchCount === 0) boardPrize = 10000;
            if (matchCount === 4) boardPrize = 10000;
            if (matchCount === 5) boardPrize = 50000;
            if (matchCount === 6) boardPrize = 500000;
            if (matchCount === 7) boardPrize = 5000000;
            if (matchCount === 8) boardPrize = 200000000;
          } else if (bac === 9) {
            if (matchCount === 0) boardPrize = 10000;
            if (matchCount === 4) boardPrize = 10000;
            if (matchCount === 5) boardPrize = 30000;
            if (matchCount === 6) boardPrize = 150000;
            if (matchCount === 7) boardPrize = 1500000;
            if (matchCount === 8) boardPrize = 12000000;
            if (matchCount === 9) boardPrize = 800000000;
          } else if (bac === 10) {
            if (matchCount === 0) boardPrize = 10000;
            if (matchCount === 5) boardPrize = 20000;
            if (matchCount === 6) boardPrize = 80000;
            if (matchCount === 7) boardPrize = 600000;
            if (matchCount === 8) boardPrize = 7400000;
            if (matchCount === 9) boardPrize = 150000000;
            if (matchCount === 10) boardPrize = 2000000000;
          }

          if (boardPrize > 0) {
            isWinner = true;
            const multiplier = Math.floor(board.cost / 10000);
            prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
          }
        });
      } else if (game.type === 'vietlott') {
        const specialNumber = draw.winningNumbers.length > 6 ? draw.winningNumbers[6] : null;

        allBoards.forEach((board) => {
          let matchCount = 0;
          let hasSpecial = false;
          
          board.numbers.forEach((numStr) => {
            if (draw.winningNumbers.slice(0, 6).includes(numStr)) matchCount++;
            else if (specialNumber && numStr === specialNumber) hasSpecial = true;
          });

          let boardPrize = 0;
          if (game.code === 'mega_645') {
            if (matchCount === 3) boardPrize = 30000;
            else if (matchCount === 4) boardPrize = 300000;
            else if (matchCount === 5) boardPrize = 10000000;
            else if (matchCount >= 6) boardPrize = draw.jackpotAmount || 1000000000;
          } else if (game.code === 'power_655') {
            if (matchCount === 3) boardPrize = 50000;
            else if (matchCount === 4) boardPrize = 500000;
            else if (matchCount === 5 && !hasSpecial) boardPrize = 40000000;
            else if (matchCount === 5 && hasSpecial) boardPrize = (draw.jackpotAmount ? draw.jackpotAmount * 0.1 : 3000000000);
            else if (matchCount === 6) boardPrize = draw.jackpotAmount || 30000000000;
          } else {
             if (matchCount >= 3) boardPrize = 100000; // Fallback MVP
          }

          if (boardPrize > 0) {
            isWinner = true;
            const multiplier = Math.floor(board.cost / 10000);
            prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
          }
        });
      } else if (game.type === 'kienthiet') {
        const w = draw.winningNumbers;
        if (w && w.length >= 9) {
          allBoards.forEach((board) => {
            for (const ticketStr of board.numbers) {
              const isWildcard = ticketStr.toLowerCase().startsWith('x');
              const ticketNum = isWildcard ? ticketStr.slice(1) : ticketStr;
              let ticketPrize = 0;

              if (w[8].endsWith(ticketNum.slice(-2))) ticketPrize += 100000;
              if (w[7].endsWith(ticketNum.slice(-3))) ticketPrize += 200000;
              if (w[6].endsWith(ticketNum.slice(-4))) ticketPrize += 400000;
              if (w[5].endsWith(ticketNum.slice(-4))) ticketPrize += 1000000;
              if (w[4].endsWith(ticketNum.slice(-5))) ticketPrize += 3000000;
              if (w[3].endsWith(ticketNum.slice(-5))) ticketPrize += 10000000;
              if (w[2].endsWith(ticketNum.slice(-5))) ticketPrize += 15000000;
              if (w[1].endsWith(ticketNum.slice(-5))) ticketPrize += 30000000;
              
              if (!isWildcard && ticketNum === w[0]) {
                 ticketPrize += 2000000000;
              } else if (w[0].endsWith(ticketNum.slice(-5))) {
                 ticketPrize += 50000000;
              }
              
              if (ticketPrize > 0) {
                 isWinner = true;
                 const multiplier = Math.floor(board.cost / 10000);
                 prizeAmount += ticketPrize * (multiplier > 0 ? multiplier : 1);
              }
            }
          });
        }
      } else if (game.type === 'dientoan') {
        const w = draw.winningNumbers;
        if (w && w.length >= 9) {
           allBoards.forEach((board) => {
             board.numbers.forEach((ticketStr) => {
                let ticketPrize = 0;
                if (game.code === 'loto_235' || game.code.includes('loto')) {
                   const numLen = ticketStr.length;
                   if (numLen === 2 && w[0].endsWith(ticketStr)) ticketPrize = 700000;
                   if (numLen === 3 && w[0].endsWith(ticketStr)) ticketPrize = 4000000;
                   if (numLen === 5 && w[0] === ticketStr) ticketPrize = 40000000;
                } else if (game.code === 'dientoan_636') {
                   ticketPrize = 100000;
                } else {
                   ticketPrize = 10000;
                }

                if (ticketPrize > 0) {
                  isWinner = true;
                  const multiplier = Math.floor(board.cost / 10000);
                  prizeAmount += ticketPrize * (multiplier > 0 ? multiplier : 1);
                }
             });
           });
        }
      }

      // --- CẬP NHẬT TRẠNG THÁI ---
      order.status = 'completed';
      order.winningNumbers = draw.winningNumbers;
      
      if (isWinner && prizeAmount > 0) {
        order.isWinner = true;
        order.prizeAmount = prizeAmount;

        // Cộng tiền cho User
        const user = await User.findById(order.user);
        if (user) {
          user.balance += prizeAmount;
          await user.save();

          // Ghi lại giao dịch
          await Transaction.create({
            user: user._id,
            type: 'deposit',
            amount: prizeAmount,
            status: 'approved'
          });

          // Tạo thông báo
          await Notification.create({
            user: user._id,
            title: '🎉 CHÚC MỪNG TRÚNG THƯỞNG 🎉',
            body: `Quý khách đã trúng thưởng vé thuộc kỳ quay ${draw.drawCode} (${game.name}). Tổng giá trị giải thưởng: ${prizeAmount.toLocaleString('vi-VN')} đ`,
            type: 'win',
            category: 'important',
            orderId: order._id.toString()
          });
          
          console.log(`PrizeService: User ${user.phone} TRÚNG THƯỞNG ${prizeAmount}đ`);
        }
      } else {
        order.isWinner = false;
        order.prizeAmount = 0;
      }
      
      await order.save();
    }

    console.log(`PrizeService: Hoàn tất dò vé cho kỳ quay ${draw.drawCode}.`);
  } catch (error) {
    console.error(`PrizeService Lỗi:`, error);
  }
};
