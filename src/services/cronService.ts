import cron from 'node-cron';
import Game from '../models/Game';
import Draw from '../models/Draw';
import { CronExpressionParser } from 'cron-parser';
import { processDrawResults } from './prizeService';

export const startCronJobs = () => {
  console.log('CronService: Bắt đầu tiến trình tự động hóa kỳ quay (chạy mỗi phút).');

  cron.schedule('* * * * *', async () => {
    try {
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
        await draw.save();
        
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
};
