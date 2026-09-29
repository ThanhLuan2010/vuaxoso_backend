import cron from 'node-cron';
import Game from '../models/Game';
import Draw from '../models/Draw';
import { CronExpressionParser } from 'cron-parser';
import { processDrawResults } from './prizeService';
import Order from '../models/Order';
import Transaction from '../models/Transaction';
import fs from 'fs';
import path from 'path';

export const ensureUpcomingDraws = async () => {
  try {
    const now = new Date();

    // 1. Power 6/55: Đảm bảo luôn có sẵn 10 kỳ quay Thứ 3,5,7 (17h20)
    const powerGame = await Game.findOne({ code: 'power_655' });
    if (powerGame) {
      const openDraws = await Draw.find({
        game: powerGame._id,
        status: 'open',
        closeTime: { $gt: now }
      }).sort({ closeTime: 1 });

      if (openDraws.length < 10) {
        const drawDays = [2, 4, 6];
        let lastCloseTime = openDraws.length > 0 ? new Date(openDraws[openDraws.length - 1].closeTime) : now;
        let lastDrawNum = 1323 + openDraws.length;
        if (openDraws.length > 0) {
          const match = openDraws[openDraws.length - 1].drawCode.match(/#?(\d+)/);
          if (match) lastDrawNum = parseInt(match[1]);
        }

        let checkDate = new Date(lastCloseTime);
        if (openDraws.length > 0) {
          checkDate.setDate(checkDate.getDate() + 1);
        }

        const needed = 10 - openDraws.length;
        let created = 0;
        while (created < needed) {
          const dayOfWeek = checkDate.getDay();
          if (drawDays.includes(dayOfWeek)) {
            const cutoff = new Date(checkDate);
            cutoff.setHours(17, 20, 0, 0);

            if (cutoff > now) {
              lastDrawNum += 1;
              const drawCode = `#${lastDrawNum}`;
              await Draw.create({
                game: powerGame._id,
                drawCode,
                openTime: new Date(cutoff.getTime() - 2 * 24 * 3600 * 1000),
                closeTime: cutoff,
                status: 'open'
              });
              created++;
            }
          }
          checkDate.setDate(checkDate.getDate() + 1);
        }
      }
    }

    // 2. Keno: Đảm bảo luôn có sẵn 10 kỳ quay 8 phút
    const kenoGames = await Game.find({ code: { $in: ['keno', 'bao_keno', 'clln_keno'] } });
    for (const kg of kenoGames) {
      const openDraws = await Draw.find({
        game: kg._id,
        status: 'open',
        closeTime: { $gt: now }
      }).sort({ closeTime: 1 });

      if (openDraws.length < 10) {
        let lastCloseTime = now;
        let lastDrawNum = 1244;
        if (openDraws.length > 0) {
          const last = openDraws[openDraws.length - 1];
          lastCloseTime = new Date(last.closeTime);
          const match = last.drawCode.match(/#?(\d+)/);
          if (match) lastDrawNum = parseInt(match[1]);
        }

        const durationMinutes = kg.drawDurationMinutes || 8;
        const needed = 10 - openDraws.length;
        for (let i = 0; i < needed; i++) {
          const openTime = new Date(lastCloseTime.getTime());
          const closeTime = new Date(openTime.getTime() + durationMinutes * 60 * 1000);
          lastDrawNum += 1;
          const drawCode = `#${lastDrawNum}`;

          await Draw.create({
            game: kg._id,
            drawCode,
            openTime,
            closeTime,
            status: 'open'
          });

          lastCloseTime = closeTime;
        }
      }
    }
  } catch (err) {
    console.error('CronService: Lỗi ensureUpcomingDraws:', err);
  }
};

export const startCronJobs = () => {
  console.log('CronService: Bắt đầu tiến trình tự động hóa kỳ quay (chạy mỗi phút).');

  // Chạy ngay khi start server để tạo sẵn 10 kỳ quay
  ensureUpcomingDraws();

  cron.schedule('* * * * *', async () => {
    try {
      await ensureUpcomingDraws();
      const now = new Date();
      
      // 1. Đóng các kỳ quay đã hết giờ
      const drawsToClose = await Draw.find({ 
        status: 'open', 
        closeTime: { $lte: now } 
      }).populate('game');

      for (const draw of drawsToClose) {
        const game = draw.game as any;
        
        if (game.autoRandomResult) {
          if (game.riggedResult) {
            draw.winningNumbers = game.riggedResult.split(',').map((n: string) => n.trim()).filter(Boolean);
            draw.status = 'completed';
            console.log(`CronService: Đã áp dụng KẾT QUẢ THAO TÚNG cho kỳ quay ${draw.drawCode} của game ${game.name}`);
            
            // Xóa kết quả thao túng sau khi đã dùng
            game.riggedResult = '';
            await game.save();
          } else {
            if (game.code === 'than_tai_4') {
              const winningNumbers: string[] = [];
              const lengths = [4, 1, 2, 3];
              lengths.forEach(len => {
                let numStr = '';
                for (let d = 0; d < len; d++) {
                  numStr += Math.floor(Math.random() * 10).toString();
                }
                winningNumbers.push(numStr);
              });
              draw.winningNumbers = winningNumbers;
            } else if (game.code === 'bingo18') {
              const winningNumbers: string[] = [];
              for (let d = 0; d < 3; d++) {
                winningNumbers.push((Math.floor(Math.random() * 6) + 1).toString());
              }
              draw.winningNumbers = winningNumbers;
            } else if (game.code === 'max_3d' || game.code === 'max_3d_pro' || game.code === 'max_4d') {
              const winningNumbers: string[] = [];
              const len = game.code === 'max_4d' ? 4 : 3;
              // Max 3D / 4D typically has multiple prizes. Let's mock a few prizes.
              for (let i = 0; i < 4; i++) {
                let numStr = '';
                for (let d = 0; d < len; d++) {
                  numStr += Math.floor(Math.random() * 10).toString();
                }
                winningNumbers.push(numStr);
              }
              draw.winningNumbers = winningNumbers;
            } else if (game.type === 'kienthiet' || (game.type === 'dientoan' && game.code !== 'dientoan_636')) {
              const winningNumbers: string[] = [];
              for (let p = 0; p < 9; p++) {
                let length = 5;
                // For loto/thantai, prize 0 is 5 digits or 4 digits. Kienthiet is 6 digits usually.
                if (p === 0) {
                  length = game.type === 'dientoan' ? 5 : 6;
                  if (game.code === 'MB') length = 5;
                }
                else if (p >= 5 && p <= 6) length = 4;
                else if (p === 7) length = 3;
                else if (p === 8) length = 2;
                
                let numStr = '';
                for (let d = 0; d < length; d++) {
                  numStr += Math.floor(Math.random() * 10).toString();
                }
                winningNumbers.push(numStr);
              }
              draw.winningNumbers = winningNumbers;
            } else {
              let drawCount = 6;
              let maxBall = 45;
              
              if (game.code === 'keno' || game.code === 'bao_keno') {
                drawCount = 20;
                maxBall = 80;
              } else if (game.code === 'power_655') {
                drawCount = 7;
                maxBall = 55;
              } else if (game.code === 'dientoan_636') {
                drawCount = 6;
                maxBall = 36;
              } else if (game.code === 'lotto_535') {
                drawCount = 5;
                maxBall = 35;
              } else if (game.code === 'lotto_570') {
                drawCount = 5;
                maxBall = 70;
              }

              const nums = new Set<string>();
              while (nums.size < drawCount) {
                const rnd = Math.floor(Math.random() * maxBall) + 1;
                nums.add(rnd.toString().padStart(2, '0'));
              }
              draw.winningNumbers = Array.from(nums);
            }
            draw.status = 'completed';
            console.log(`CronService: Đã tự động sinh kết quả ngẫu nhiên cho kỳ quay ${draw.drawCode}`);
            
            // Lịch trình trả thưởng không cần await để không block vòng lặp (hoặc await cũng được)
          }
        } else {
          draw.status = 'closed';
          console.log(`CronService: Đã đóng kỳ quay ${draw.drawCode} của game ${game.name} (Chờ nhập kết quả)`);
        }
        try {
          await draw.save();
        } catch (err) {
          console.error(`CronService: Lỗi lưu kỳ quay ${draw.drawCode} (VersionError)`, err);
        }
        
        // Trả thưởng tự động nếu kỳ quay có kết quả (tự sinh hoặc thao túng)
        if (game.autoRandomResult) {
           processDrawResults(draw._id.toString());
        }
      }

      // 2. Mở kỳ quay mới cho các Game có cấu hình cron
      const activeGames = await Game.find({ 
        isActive: true, 
        cronExpression: { $exists: true, $ne: '' } 
      });

      for (const game of activeGames) {
        try {
          if (!game.cronExpression) continue;
          
          const interval = CronExpressionParser.parse(game.cronExpression);
          const nextRun = interval.next().toDate();
          const prevRun = interval.prev().toDate();
          
          // Kiểm tra xem thời điểm "prevRun" có nằm trong phạm vi của phút hiện tại không
          // Node-cron chạy mỗi phút, nên nếu prevRun thuộc phút này (sai số < 60s) thì là đến lúc tạo
          const diffSeconds = Math.abs(now.getTime() - prevRun.getTime()) / 1000;
          
          if (diffSeconds < 60) {
            // Đến giờ tạo kỳ mới
            // Kiểm tra xem kỳ quay cho chu kỳ này đã tồn tại chưa để tránh trùng lặp
            const openTime = prevRun;
            const closeTime = new Date(openTime.getTime() + (game.drawDurationMinutes || 10) * 60000);
            
            // Tạo mã kỳ dựa trên thời gian
            const hours = String(openTime.getHours()).padStart(2, '0');
            const minutes = String(openTime.getMinutes()).padStart(2, '0');
            const drawCode = `#${hours}${minutes}`;

            const existingDraw = await Draw.findOne({
              game: game._id,
              drawCode: drawCode,
              openTime: openTime
            });

            if (!existingDraw) {
              await Draw.create({
                game: game._id,
                drawCode,
                openTime,
                closeTime,
                status: 'open'
              });
              console.log(`CronService: Đã mở kỳ quay mới ${drawCode} cho game ${game.name}`);
            }
          }
        } catch (err) {
          console.error(`CronService: Lỗi parse cron cho game ${game.name}`, err);
        }
      }
    } catch (error) {
      console.error('CronService: Lỗi xử lý cron', error);
    }
  });

  // Cleanup Cron (chạy mỗi ngày vào lúc 2:00 AM)
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('CronService: Bắt đầu tiến trình dọn dẹp dữ liệu (Data Retention).');
      const now = new Date();
      
      // 1. Delete Orders older than 2 months (60 days)
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      
      // Optional: Xuất dữ liệu ra file trước khi xoá. 
      // Do yêu cầu "Xuất và xoá", ta ghi thẳng ra file backup
      const oldOrders = await Order.find({ createdAt: { $lt: twoMonthsAgo } });
      if (oldOrders.length > 0) {
        const backupDir = path.join(process.cwd(), 'uploads', 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const backupFile = path.join(backupDir, `orders_backup_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(oldOrders));
        console.log(`CronService: Đã xuất ${oldOrders.length} đơn cược cũ ra file backup.`);
        
        const orderDelRes = await Order.deleteMany({ createdAt: { $lt: twoMonthsAgo } });
        console.log(`CronService: Đã xoá ${orderDelRes.deletedCount} đơn cược cũ hơn 2 tháng.`);
      }

      // 2. Delete Transactions older than 1 year (365 days)
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const txDelRes = await Transaction.deleteMany({ createdAt: { $lt: oneYearAgo } });
      console.log(`CronService: Đã xoá ${txDelRes.deletedCount} giao dịch cũ hơn 1 năm.`);

      // 3. Remove receipt images for deposits older than 1 month (30 days)
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oldReceipts = await Transaction.find({ 
        createdAt: { $lt: oneMonthAgo }, 
        type: 'deposit', 
        receiptImage: { $ne: null } 
      });
      
      let receiptCount = 0;
      for (const tx of oldReceipts) {
        if (tx.receiptImage) {
          try {
             let imgPath = tx.receiptImage;
             if (imgPath.startsWith('/')) imgPath = imgPath.substring(1);
             const filePath = path.join(process.cwd(), imgPath);
             if (fs.existsSync(filePath)) {
               fs.unlinkSync(filePath);
             }
             tx.receiptImage = undefined;
             await tx.save();
             receiptCount++;
          } catch(err) {
             console.error(`Lỗi xoá ảnh hoá đơn ${tx._id}:`, err);
          }
        }
      }
      console.log(`CronService: Đã xoá ${receiptCount} file ảnh sao kê nạp tiền cũ hơn 1 tháng.`);
      
    } catch (err) {
      console.error('CronService: Lỗi tiến trình dọn dẹp', err);
    }
  });
};
