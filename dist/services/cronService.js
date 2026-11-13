"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCronJobs = exports.ensureGameConfigs = exports.ensureUpcomingDraws = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const Game_1 = __importDefault(require("../models/Game"));
const Draw_1 = __importDefault(require("../models/Draw"));
const cron_parser_1 = require("cron-parser");
const prizeService_1 = require("./prizeService");
const Order_1 = __importDefault(require("../models/Order"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function getVNCutoffDate(date, vnHour = 17, vnMinute = 20) {
    const vnStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const [year, month, day] = vnStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, vnHour - 7, vnMinute, 0, 0));
}
function getVNDayOfWeek(date) {
    const dayStr = date.toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' });
    const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    return dayMap[dayStr] ?? date.getDay();
}
const ensureUpcomingDraws = async () => {
    try {
        const now = new Date();
        // Tự động dọn dẹp các kỳ quay thừa của game phái sinh lô đề (dùng chung kết quả XSKT 3 Miền)
        const derivedGames = await Game_1.default.find({ code: { $in: ['xoso_3mien', 'lode'] } }).select('_id');
        if (derivedGames.length > 0) {
            await Draw_1.default.deleteMany({
                game: { $in: derivedGames.map(g => g._id) },
                status: 'open'
            });
        }
        // 1. Vietlott / Điện Toán: Đảm bảo luôn có sẵn 10 kỳ quay
        const scheduledGames = await Game_1.default.find({
            code: { $nin: ['keno', 'bao_keno', 'clln_keno', 'bingo18', 'MB', 'MT', 'MN', 'xoso_3mien', 'lode'] }
        });
        for (const game of scheduledGames) {
            const todayCutoff = getVNCutoffDate(now, 17, 20);
            await Draw_1.default.updateMany({ game: game._id, status: 'open', closeTime: { $lte: now } }, { $set: { status: 'closed' } });
            const openDraws = await Draw_1.default.find({
                game: game._id,
                status: 'open',
                closeTime: { $gt: now }
            }).sort({ closeTime: 1 });
            if (openDraws.length < 10) {
                if (game.code === 'lotto_535') {
                    let lastDrawNum = 1300;
                    const allDraws = await Draw_1.default.find({ game: game._id }).sort({ closeTime: -1 });
                    if (allDraws.length > 0) {
                        const match = allDraws[0].drawCode.match(/#?(\d+)/);
                        if (match)
                            lastDrawNum = parseInt(match[1]);
                    }
                    let checkDay = new Date(now);
                    const needed = 10 - openDraws.length;
                    let created = 0;
                    while (created < needed) {
                        const cutoffs = [
                            { close: getVNCutoffDate(checkDay, 12, 0), draw: getVNCutoffDate(checkDay, 13, 0) },
                            { close: getVNCutoffDate(checkDay, 20, 0), draw: getVNCutoffDate(checkDay, 21, 0) }
                        ];
                        for (const item of cutoffs) {
                            if (item.close > now) {
                                const exists = await Draw_1.default.findOne({ game: game._id, closeTime: item.close });
                                if (!exists && created < needed) {
                                    lastDrawNum += 1;
                                    const drawCode = `#${String(lastDrawNum).padStart(4, '0')}`;
                                    await Draw_1.default.create({
                                        game: game._id,
                                        drawCode,
                                        openTime: new Date(item.close.getTime() - 8 * 3600 * 1000),
                                        closeTime: item.close,
                                        drawTime: item.draw,
                                        status: 'open'
                                    });
                                    created++;
                                }
                            }
                        }
                        checkDay.setDate(checkDay.getDate() + 1);
                    }
                    continue;
                }
                let drawDays = [0, 1, 2, 3, 4, 5, 6];
                if (game.code === 'power_655' || game.code === 'max_3d_pro') {
                    drawDays = [2, 4, 6];
                }
                else if (game.code === 'mega_645') {
                    drawDays = [3, 5, 0];
                }
                else if (game.code === 'max_3d') {
                    drawDays = [1, 3, 5];
                }
                else if (game.code === 'dientoan_636' || game.code === 'bao_636') {
                    drawDays = [3, 6];
                }
                let lastDrawNum = 1000;
                if (game.code === 'mega_645')
                    lastDrawNum = 1250;
                else if (game.code === 'power_655')
                    lastDrawNum = 1323;
                else if (game.code === 'max_4d')
                    lastDrawNum = 750;
                else if (game.code === 'max_3d')
                    lastDrawNum = 850;
                else if (game.code === 'max_3d_pro')
                    lastDrawNum = 1539;
                if (openDraws.length > 0) {
                    const match = openDraws[openDraws.length - 1].drawCode.match(/#?(\d+)/);
                    if (match)
                        lastDrawNum = parseInt(match[1]);
                }
                else {
                    const lastCompleted = await Draw_1.default.findOne({ game: game._id }).sort({ closeTime: -1 });
                    if (lastCompleted) {
                        const match = lastCompleted.drawCode.match(/#?(\d+)/);
                        if (match)
                            lastDrawNum = parseInt(match[1]);
                    }
                }
                let checkDate = new Date(now);
                if (openDraws.length > 0) {
                    const lastOpenCloseTime = new Date(openDraws[openDraws.length - 1].closeTime);
                    checkDate = new Date(lastOpenCloseTime.getTime() + 24 * 3600 * 1000);
                }
                const needed = 10 - openDraws.length;
                let created = 0;
                while (created < needed) {
                    const dayOfWeek = getVNDayOfWeek(checkDate);
                    if (drawDays.includes(dayOfWeek)) {
                        const isLotto570 = game.code === 'lotto_570';
                        const isMbTimeGame = ['loto_235', 'loto_cap', 'truot_loto', 'bao_loto_2'].includes(game.code);
                        const is18h15Game = ['dientoan_636', 'bao_636'].includes(game.code) || isMbTimeGame;
                        const closeCutoff = isLotto570
                            ? getVNCutoffDate(checkDate, 17, 0)
                            : (isMbTimeGame ? getVNCutoffDate(checkDate, 18, 10) : getVNCutoffDate(checkDate, 17, 20));
                        const drawCutoff = isLotto570
                            ? getVNCutoffDate(checkDate, 17, 20)
                            : (is18h15Game ? getVNCutoffDate(checkDate, 18, 15) : getVNCutoffDate(checkDate, 18, 0));
                        if (closeCutoff > now) {
                            lastDrawNum += 1;
                            const drawCode = `#${String(lastDrawNum).padStart(4, "0")}`;
                            await Draw_1.default.create({
                                game: game._id,
                                drawCode,
                                openTime: new Date(closeCutoff.getTime() - 24 * 3600 * 1000 + (isMbTimeGame ? 5 * 60 * 1000 : 0)),
                                closeTime: closeCutoff,
                                drawTime: drawCutoff,
                                status: 'open'
                            });
                            created++;
                        }
                    }
                    checkDate.setDate(checkDate.getDate() + 1);
                }
            }
        }
        // 2. Keno & Bingo18: Đảm bảo luôn có sẵn 10 kỳ quay (Keno: 8p, Bingo18: 6p)
        const fastGames = await Game_1.default.find({ code: { $in: ['keno', 'bao_keno', 'clln_keno', 'bingo18'] } });
        for (const kg of fastGames) {
            if (kg.code === 'bingo18') {
                const maxAllowedCloseTime = new Date(now.getTime() + 3 * 3600 * 1000);
                await Draw_1.default.deleteMany({
                    game: kg._id,
                    status: 'open',
                    closeTime: { $gt: maxAllowedCloseTime }
                });
            }
            const openDraws = await Draw_1.default.find({
                game: kg._id,
                status: 'open',
                closeTime: { $gt: now }
            }).sort({ closeTime: 1 });
            if (openDraws.length < 10) {
                let lastCloseTime = now;
                let lastDrawNum = kg.code === 'bingo18' ? 1 : 1244;
                if (openDraws.length > 0) {
                    const last = openDraws[openDraws.length - 1];
                    lastCloseTime = new Date(last.closeTime);
                    const match = last.drawCode.match(/#?(\d+)/);
                    if (match)
                        lastDrawNum = parseInt(match[1]);
                }
                const durationMinutes = kg.code === 'bingo18' ? 8 : (kg.drawDurationMinutes || 8);
                const needed = 10 - openDraws.length;
                for (let i = 0; i < needed; i++) {
                    const openTime = new Date(lastCloseTime.getTime());
                    const closeTime = new Date(openTime.getTime() + durationMinutes * 60 * 1000);
                    lastDrawNum += 1;
                    const drawCode = kg.code === 'bingo18' ? `#${String(lastDrawNum).padStart(5, '0')}` : `#${lastDrawNum}`;
                    await Draw_1.default.create({
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
        // 3. Xổ số Kiến Thiết (Miền Nam, Miền Trung, Miền Bắc): Luôn đảm bảo có sẵn các kỳ quay mở theo từng tỉnh/đài
        const { ensureKienThietDraws } = require('../controllers/drawController');
        await ensureKienThietDraws();
    }
    catch (err) {
        console.error('CronService: Lỗi ensureUpcomingDraws:', err);
    }
};
exports.ensureUpcomingDraws = ensureUpcomingDraws;
const GAME_CONFIGS = [
    { code: 'keno', cronExpression: '*/8 * * * *', drawDurationMinutes: 8, autoRandomResult: true },
    { code: 'bao_keno', cronExpression: '*/8 * * * *', drawDurationMinutes: 8, autoRandomResult: true },
    { code: 'clln_keno', cronExpression: '*/8 * * * *', drawDurationMinutes: 8, autoRandomResult: true },
    { code: 'power_655', cronExpression: '0 18 * * 2,4,6', drawDurationMinutes: 0 },
    { code: 'mega_645', cronExpression: '0 18 * * 3,5,0', drawDurationMinutes: 0 },
    { code: 'max_3d', cronExpression: '0 18 * * 1,3,5', drawDurationMinutes: 0 },
    { code: 'max_3d_pro', cronExpression: '0 18 * * 2,4,6', drawDurationMinutes: 0 },
    { code: 'max_4d', cronExpression: '0 18 * * *', drawDurationMinutes: 0 },
    { code: 'dientoan_636', cronExpression: '15 18 * * 3,6', drawDurationMinutes: 0 },
    { code: 'bao_636', cronExpression: '15 18 * * 3,6', drawDurationMinutes: 0 },
    { code: 'loto_235', cronExpression: '15 18 * * *', drawDurationMinutes: 0 },
    { code: 'loto_cap', cronExpression: '15 18 * * *', drawDurationMinutes: 0 },
    { code: 'truot_loto', cronExpression: '15 18 * * *', drawDurationMinutes: 0 },
    { code: 'than_tai_4', cronExpression: '0 18 * * *', drawDurationMinutes: 0 },
    { code: 'bingo18', cronExpression: '*/8 * * * *', drawDurationMinutes: 8, autoRandomResult: true },
    { code: 'bao_loto_2', cronExpression: '15 18 * * *', drawDurationMinutes: 0 },
    { code: 'lotto_535', cronExpression: '0 13,21 * * *', drawDurationMinutes: 0 },
    { code: 'lotto_570', cronExpression: '20 17 * * *', drawDurationMinutes: 0 },
    { code: 'MB', cronExpression: '15 18 * * *', drawDurationMinutes: 0 },
    { code: 'MT', cronExpression: '15 17 * * *', drawDurationMinutes: 0 },
    { code: 'MN', cronExpression: '15 16 * * *', drawDurationMinutes: 0 }
];
const ensureGameConfigs = async () => {
    try {
        // Bật tự động tạo kết quả cho Keno và Bingo18
        await Game_1.default.updateMany({ code: { $in: ['keno', 'bao_keno', 'clln_keno', 'bingo18'] } }, { $set: { autoRandomResult: true } });
        // Đảm bảo tắt tự động tạo kết quả cho tất cả các game còn lại
        await Game_1.default.updateMany({ code: { $nin: ['keno', 'bao_keno', 'clln_keno', 'bingo18'] } }, { $set: { autoRandomResult: false } });
        for (const cfg of GAME_CONFIGS) {
            const isAuto = ['keno', 'bao_keno', 'clln_keno', 'bingo18'].includes(cfg.code);
            await Game_1.default.updateOne({ code: cfg.code }, { $set: { cronExpression: cfg.cronExpression, drawDurationMinutes: cfg.drawDurationMinutes, autoRandomResult: isAuto } });
        }
        let truotGame = await Game_1.default.findOne({ code: 'truot_loto' });
        if (!truotGame) {
            await Game_1.default.create({
                code: 'truot_loto',
                name: 'TRƯỢT LÔ TÔ (4-8-10 cặp)',
                type: 'dientoan',
                brandColor: '#FF4D15',
                bgColor: '#FFF2EE',
                badge: 'Mỗi ngày',
                subtext: '🏆 x12 lần',
                isActive: true,
                cronExpression: '15 18 * * *',
                drawDurationMinutes: 0,
                autoRandomResult: false,
                payoutRates: { 'Trượt 4': 2.5, 'Trượt 8': 8.5, 'Trượt 10': 12 }
            });
            console.log('CronService: Đã tự động tạo game TRƯỢT LÔ TÔ (truot_loto)');
        }
        const lodeGame = await Game_1.default.findOne({ code: 'xoso_3mien' });
        if (!lodeGame) {
            await Game_1.default.create({
                code: 'xoso_3mien',
                name: 'LÔ ĐỀ 3 MIỀN',
                type: 'lode',
                brandColor: '#E51F27',
                bgColor: '#FCE8EA',
                badge: 'Đủ 3 Miền',
                cronExpression: '',
                drawDurationMinutes: 0,
                isActive: true
            });
            console.log('CronService: Đã tự động tạo game LÔ ĐỀ 3 MIỀN (xoso_3mien)');
        }
    }
    catch (err) {
        console.error('CronService: Lỗi đồng bộ cấu hình game:', err);
    }
};
exports.ensureGameConfigs = ensureGameConfigs;
const startCronJobs = () => {
    console.log('CronService: Bắt đầu tiến trình tự động hóa kỳ quay (chạy mỗi phút).');
    // Chạy ngay khi start server để tự động đồng bộ cấu hình và tạo sẵn 10 kỳ quay
    (0, exports.ensureGameConfigs)();
    (0, exports.ensureUpcomingDraws)();
    node_cron_1.default.schedule('* * * * *', async () => {
        try {
            await (0, exports.ensureUpcomingDraws)();
            const now = new Date();
            // 1. Đóng các kỳ quay đã hết giờ & tự động sinh kết quả cho Keno và Bingo18
            const drawsToClose = await Draw_1.default.find({
                status: { $in: ['open', 'closed'] },
                closeTime: { $lte: now }
            }).populate('game');
            for (const draw of drawsToClose) {
                const game = draw.game;
                if (!game)
                    continue;
                const isAutoGame = ['keno', 'bao_keno', 'clln_keno', 'bingo18'].includes(game.code) || game.autoRandomResult === true;
                if (isAutoGame) {
                    // Xổ số tự động cho Keno và Bingo18
                    if (draw.status !== 'completed' || !draw.winningNumbers || draw.winningNumbers.length === 0) {
                        if (game.riggedResult) {
                            draw.winningNumbers = game.riggedResult.split(',').map((n) => n.trim()).filter(Boolean);
                            draw.status = 'completed';
                            console.log(`CronService: Đã áp dụng KẾT QUẢ THAO TÚNG cho kỳ quay ${draw.drawCode} của game ${game.name}`);
                            game.riggedResult = '';
                            await game.save();
                        }
                        else {
                            if (game.code === 'bingo18') {
                                const winningNumbers = [];
                                for (let d = 0; d < 3; d++) {
                                    winningNumbers.push((Math.floor(Math.random() * 6) + 1).toString());
                                }
                                draw.winningNumbers = winningNumbers;
                            }
                            else {
                                // Keno: 20 số ngẫu nhiên từ 01 đến 80
                                const nums = new Set();
                                while (nums.size < 20) {
                                    const rnd = Math.floor(Math.random() * 80) + 1;
                                    nums.add(rnd.toString().padStart(2, '0'));
                                }
                                draw.winningNumbers = Array.from(nums);
                            }
                            draw.status = 'completed';
                            console.log(`CronService: Đã tự động sinh kết quả ngẫu nhiên cho kỳ quay ${draw.drawCode} của game ${game.name}`);
                        }
                        try {
                            await draw.save();
                            (0, prizeService_1.processDrawResults)(draw._id.toString());
                        }
                        catch (err) {
                            console.error(`CronService: Lỗi lưu kỳ quay ${draw.drawCode}`, err);
                        }
                    }
                }
                else {
                    // Các game khác: chỉ chốt cược nếu đang open, chờ Admin nhập kết quả
                    if (draw.status === 'open') {
                        draw.status = 'closed';
                        try {
                            await draw.save();
                            console.log(`CronService: Đã chốt nhận vé kỳ quay ${draw.drawCode} của game ${game.name} (Chờ Admin nhập kết quả)`);
                        }
                        catch (err) {
                            console.error(`CronService: Lỗi lưu kỳ quay ${draw.drawCode}`, err);
                        }
                    }
                }
            }
            // 2. Mở kỳ quay mới cho các Game có cấu hình cron (trừ game quay nhanh đã xử lý liên tục 10 kỳ)
            const activeGames = await Game_1.default.find({
                isActive: true,
                cronExpression: { $exists: true, $ne: '' },
                code: { $nin: ['keno', 'bao_keno', 'clln_keno', 'bingo18'] }
            });
            for (const game of activeGames) {
                try {
                    if (!game.cronExpression)
                        continue;
                    const interval = cron_parser_1.CronExpressionParser.parse(game.cronExpression);
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
                        const existingDraw = await Draw_1.default.findOne({
                            game: game._id,
                            drawCode: drawCode,
                            openTime: openTime
                        });
                        if (!existingDraw) {
                            await Draw_1.default.create({
                                game: game._id,
                                drawCode,
                                openTime,
                                closeTime,
                                status: 'open'
                            });
                            console.log(`CronService: Đã mở kỳ quay mới ${drawCode} cho game ${game.name}`);
                        }
                    }
                }
                catch (err) {
                    console.error(`CronService: Lỗi parse cron cho game ${game.name}`, err);
                }
            }
        }
        catch (error) {
            console.error('CronService: Lỗi xử lý cron', error);
        }
    });
    // Cleanup Cron (chạy mỗi ngày vào lúc 2:00 AM)
    node_cron_1.default.schedule('0 2 * * *', async () => {
        try {
            console.log('CronService: Bắt đầu tiến trình dọn dẹp dữ liệu (Data Retention).');
            const now = new Date();
            // 1. Delete Orders older than 2 months (60 days)
            const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            // Optional: Xuất dữ liệu ra file trước khi xoá. 
            // Do yêu cầu "Xuất và xoá", ta ghi thẳng ra file backup
            const oldOrders = await Order_1.default.find({ createdAt: { $lt: twoMonthsAgo } });
            if (oldOrders.length > 0) {
                const backupDir = path_1.default.join(process.cwd(), 'uploads', 'backups');
                if (!fs_1.default.existsSync(backupDir))
                    fs_1.default.mkdirSync(backupDir, { recursive: true });
                const backupFile = path_1.default.join(backupDir, `orders_backup_${Date.now()}.json`);
                fs_1.default.writeFileSync(backupFile, JSON.stringify(oldOrders));
                console.log(`CronService: Đã xuất ${oldOrders.length} đơn cược cũ ra file backup.`);
                const orderDelRes = await Order_1.default.deleteMany({ createdAt: { $lt: twoMonthsAgo } });
                console.log(`CronService: Đã xoá ${orderDelRes.deletedCount} đơn cược cũ hơn 2 tháng.`);
            }
            // 2. Delete Transactions older than 1 year (365 days)
            const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            const txDelRes = await Transaction_1.default.deleteMany({ createdAt: { $lt: oneYearAgo } });
            console.log(`CronService: Đã xoá ${txDelRes.deletedCount} giao dịch cũ hơn 1 năm.`);
            // 3. Remove receipt images for deposits older than 1 month (30 days)
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const oldReceipts = await Transaction_1.default.find({
                createdAt: { $lt: oneMonthAgo },
                type: 'deposit',
                receiptImage: { $ne: null }
            });
            let receiptCount = 0;
            for (const tx of oldReceipts) {
                if (tx.receiptImage) {
                    try {
                        let imgPath = tx.receiptImage;
                        if (imgPath.startsWith('/'))
                            imgPath = imgPath.substring(1);
                        const filePath = path_1.default.join(process.cwd(), imgPath);
                        if (fs_1.default.existsSync(filePath)) {
                            fs_1.default.unlinkSync(filePath);
                        }
                        tx.receiptImage = undefined;
                        await tx.save();
                        receiptCount++;
                    }
                    catch (err) {
                        console.error(`Lỗi xoá ảnh hoá đơn ${tx._id}:`, err);
                    }
                }
            }
            console.log(`CronService: Đã xoá ${receiptCount} file ảnh sao kê nạp tiền cũ hơn 1 tháng.`);
        }
        catch (err) {
            console.error('CronService: Lỗi tiến trình dọn dẹp', err);
        }
    });
};
exports.startCronJobs = startCronJobs;
