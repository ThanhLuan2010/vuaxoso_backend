"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processDrawResults = void 0;
const Draw_1 = __importDefault(require("../models/Draw"));
const Province_1 = __importDefault(require("../models/Province"));
const Order_1 = __importDefault(require("../models/Order"));
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const BalanceHistory_1 = __importDefault(require("../models/BalanceHistory"));
const Notification_1 = __importDefault(require("../models/Notification"));
const AdminLog_1 = __importDefault(require("../models/AdminLog"));
const EncryptionHelper_1 = require("../utils/EncryptionHelper");
const getCombinationsList = (array, k) => {
    const result = [];
    const helper = (start, combo) => {
        if (combo.length === k) {
            result.push([...combo]);
            return;
        }
        for (let i = start; i < array.length; i++) {
            combo.push(array[i]);
            helper(i + 1, combo);
            combo.pop();
        }
    };
    helper(0, []);
    return result;
};
const processDrawResults = async (drawId) => {
    try {
        const draw = await Draw_1.default.findById(drawId).populate('game');
        if (!draw || draw.status !== 'completed' || !draw.winningNumbers || draw.winningNumbers.length === 0) {
            console.log(`PrizeService: Kỳ quay ${drawId} chưa hoàn thành hoặc chưa có kết quả.`);
            return;
        }
        const game = draw.game;
        console.log(`PrizeService: Bắt đầu dò vé cho kỳ quay ${draw.drawCode} (Game: ${game.code})`);
        // Lấy các đơn hàng có drawId là ObjectId hoặc drawCode VÀ phải đúng gameType
        // Lấy cả 'pending' (chưa in) và 'completed' (đã in trên CMS) để dò vé
        const cleanDrawCode = draw.drawCode ? (draw.drawCode.startsWith('#') ? draw.drawCode : `#${draw.drawCode}`) : '';
        const rawDrawCode = draw.drawCode ? draw.drawCode.replace(/^#/, '') : '';
        const possibleDrawIds = [
            draw._id,
            draw._id.toString(),
            draw.drawCode,
            cleanDrawCode,
            rawDrawCode
        ].filter(Boolean);
        // Tính ngày xổ theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)
        const closeTimeDate = new Date(draw.closeTime || draw.drawTime || draw.createdAt);
        const vnDayStr = closeTimeDate.toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }); // "10/11/2026"
        const vnIsoDate = closeTimeDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // "2026-11-10"
        const schedDate = `sched_${vnIsoDate}`;
        const dateList = [vnDayStr, vnIsoDate, schedDate];
        const is3MienOrLode = game.type === 'kienthiet' || game.type === 'lode' || ['MB', 'MT', 'MN', 'xoso_3mien', 'lode'].includes(game.code);
        if (is3MienOrLode && draw.provinceId && draw.provinceId !== 'MB') {
            // Chỉ tìm các kỳ quay trùng lặp của ĐÚNG TỈNH ĐÓ (provinceId khớp chính xác) để thêm vào possibleDrawIds
            // Tuyệt đối không can thiệp hay ghi đè kết quả của các tỉnh/đài khác!
            const sameProvinceDraws = await Draw_1.default.find({
                _id: { $ne: draw._id },
                game: draw.game,
                provinceId: draw.provinceId,
                closeTime: {
                    $gte: new Date(closeTimeDate.getTime() - 2 * 3600 * 1000),
                    $lte: new Date(closeTimeDate.getTime() + 2 * 3600 * 1000)
                }
            }).select('_id drawCode').lean();
            sameProvinceDraws.forEach(sd => {
                possibleDrawIds.push(sd._id);
                possibleDrawIds.push(sd._id.toString());
                if (sd.drawCode) {
                    possibleDrawIds.push(sd.drawCode);
                    possibleDrawIds.push(sd.drawCode.replace(/^#/, ''));
                }
            });
        }
        let orderConditions = [
            { drawId: { $in: possibleDrawIds } }
        ];
        if (['loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(game.code)) {
            orderConditions.push({
                $and: [
                    { $or: [{ drawDate: { $in: dateList } }, { drawId: { $in: dateList } }, { drawId: { $regex: new RegExp(vnIsoDate.replace(/-/g, ''), 'i') } }] },
                    { gameType: game.code }
                ]
            });
        }
        if (is3MienOrLode) {
            const isMB = game.code === 'MB' || draw.provinceId === 'MB';
            const isMT = game.code === 'MT';
            const isMN = game.code === 'MN';
            let targetProvince = null;
            if (draw.provinceId && draw.provinceId !== 'MB') {
                targetProvince = await Province_1.default.findOne({
                    $or: [
                        { provinceId: draw.provinceId },
                        { code: draw.provinceId },
                        { name: new RegExp(`^${draw.provinceId}$`, 'i') }
                    ]
                }).lean();
            }
            if (isMB) {
                const mbRegex = /miền bắc|hà nội|mb|xsmb/i;
                orderConditions.push({
                    $and: [
                        { $or: [{ drawDate: { $in: dateList } }, { drawId: { $in: dateList } }] },
                        {
                            $or: [
                                { gameType: { $in: ['MB', 'mb', 'kienthiet_mb'] } },
                                {
                                    gameType: { $in: ['xoso_3mien', 'lode'] },
                                    $or: [
                                        { provinceName: { $regex: mbRegex } },
                                        { provinceName: { $in: [null, '', undefined] } }
                                    ]
                                },
                                { provinceName: { $regex: mbRegex } }
                            ]
                        }
                    ]
                });
            }
            else if (targetProvince) {
                // Cho MT / MN khi có đài/tỉnh cụ thể: Chỉ dò vé của đúng đài/tỉnh này!
                const escapedNames = [targetProvince.name, targetProvince.code, targetProvince.provinceId]
                    .filter(Boolean)
                    .map((s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'));
                const provRegex = new RegExp(`^(${escapedNames.join('|')})$`, 'i');
                const ktGameType = `kienthiet_${targetProvince.provinceId.toLowerCase()}`;
                orderConditions.push({
                    $and: [
                        { $or: [{ drawDate: { $in: dateList } }, { drawId: { $in: dateList } }] },
                        {
                            $or: [
                                { provinceName: { $regex: provRegex } },
                                { gameType: ktGameType }
                            ]
                        }
                    ]
                });
            }
            else if (isMN || isMT) {
                // Fallback khi kỳ quay cũ không gắn provinceId
                const regionGameTypes = [game.code, game.code.toLowerCase(), `kienthiet_${game.code.toLowerCase()}`];
                const regionRegex = isMN ? /miền nam|mn/i : /miền trung|mt/i;
                orderConditions.push({
                    $and: [
                        { $or: [{ drawDate: { $in: dateList } }, { drawId: { $in: dateList } }] },
                        {
                            $or: [
                                { gameType: { $in: regionGameTypes } },
                                { provinceName: { $regex: regionRegex } }
                            ]
                        }
                    ]
                });
            }
        }
        let orderQuery = {
            $or: orderConditions,
            status: { $in: ['pending', 'completed'] },
        };
        if (is3MienOrLode) {
            orderQuery.gameType = {
                $in: [
                    game.code,
                    `kienthiet_${game.code.toLowerCase()}`,
                    'MB', 'MT', 'MN',
                    'xoso_3mien',
                    'lode',
                    /^kienthiet_/i
                ]
            };
        }
        else if (game.code === 'keno' || game.code === 'bao_keno' || game.code === 'clln_keno') {
            orderQuery.gameType = { $in: ['keno', 'bao_keno', 'clln_keno'] };
        }
        else {
            orderQuery.gameType = game.code;
        }
        let orders = await Order_1.default.find(orderQuery);
        // Chỉ xử lý những vé chưa được dò (chưa có winningNumbers)
        orders = orders.filter(o => !o.winningNumbers || o.winningNumbers.length === 0);
        console.log(`PrizeService: Tìm thấy ${orders.length} đơn hàng đang chờ dò vé.`);
        // PASS 1: Keno Jackpot calculation
        let totalJackpotWinners = 0;
        if (game.code === 'keno') {
            const drawNumbers = new Set(draw.winningNumbers);
            orders.forEach(order => {
                let allBoards = [];
                if (order.items && order.items.length > 0)
                    allBoards = order.items.map(item => ({ numbers: item.numbers, cost: item.cost }));
                else if (order.numbers && order.numbers.length > 0)
                    allBoards = [{ numbers: order.numbers, cost: order.totalCost }];
                allBoards.forEach((board) => {
                    if (board.numbers.length === 10) {
                        let matchCount = 0;
                        board.numbers.forEach((numStr) => { if (drawNumbers.has(numStr))
                            matchCount++; });
                        if (matchCount === 10) {
                            const multiplier = Math.floor(board.cost / 10000);
                            totalJackpotWinners += (multiplier > 0 ? multiplier : 1);
                        }
                    }
                });
            });
        }
        const maxJackpotPool = 10000000000; // 10 Tỷ
        let jackpotPrizePerWinner = 1000010000; // 1 Tỷ + 10k
        if (totalJackpotWinners * 1000010000 > maxJackpotPool) {
            jackpotPrizePerWinner = Math.floor(maxJackpotPool / totalJackpotWinners);
        }
        for (const order of orders) {
            let isWinner = false;
            let prizeAmount = 0;
            let allBoards = [];
            if (order.items && order.items.length > 0) {
                allBoards = order.items.map(item => ({
                    numbers: item.numbers,
                    specialNumbers: item.specialNumbers,
                    cost: item.cost,
                    baseCost: item.baseCost,
                    playType: item.playType || order.playType
                }));
            }
            else if (order.numbers && order.numbers.length > 0) {
                allBoards = [{ numbers: order.numbers, cost: order.totalCost, playType: order.playType }];
            }
            // --- LOGIC DÒ VÉ KENO / BAO KENO / CHẴN LẺ LỚN NHỎ ---
            if (game.code === 'keno' || game.code === 'bao_keno' || game.code === 'clln_keno') {
                const isBaoKeno = order.gameType === 'bao_keno' || (order.playType && order.playType.includes('Bao'));
                if (isBaoKeno) {
                    // BAO KENO LOGIC (Theo bảng tỷ lệ thưởng chuẩn)
                    const drawNumbers = new Set(draw.winningNumbers);
                    const BAO_KENO_RATES = {
                        2: 9, // Bậc 2: 1 ăn 9 -> 90.000đ
                        3: 30, // Bậc 3: 1 ăn 30 -> 300.000đ
                        4: 150, // Bậc 4: 1 ăn 150 -> 1.500.000đ
                        5: 350, // Bậc 5: 1 ăn 350 -> 3.500.000đ
                        6: 650, // Bậc 6: 1 ăn 650 -> 6.500.000đ
                        7: 950, // Bậc 7: 1 ăn 950 -> 9.500.000đ
                        8: 1950, // Bậc 8: 1 ăn 1950 -> 19.500.000đ
                        9: 2950, // Bậc 9: 1 ăn 2950 -> 29.500.000đ
                        10: 4500, // Bậc 10: 1 ăn 4500 -> 45.000.000đ
                    };
                    const combinationsCount = (n, k) => {
                        if (k < 0 || k > n)
                            return 0;
                        if (k === 0 || k === n)
                            return 1;
                        let res = 1;
                        for (let i = 1; i <= k; i++) {
                            res = (res * (n - i + 1)) / i;
                        }
                        return Math.round(res);
                    };
                    allBoards.forEach((board) => {
                        let matchCount = 0;
                        board.numbers.forEach((numStr) => {
                            if (drawNumbers.has(numStr))
                                matchCount++;
                        });
                        // Lấy Bậc K từ playType (vd: "Bao 3 - Bậc 2") hoặc từ số lượng con nếu là vé xiên cũ
                        const match = (order.playType || '').match(/Bậc\s+(\d+)/i);
                        const baoBac = match ? parseInt(match[1], 10) : (board.numbers.length <= 10 ? board.numbers.length : 2);
                        const baoType = board.numbers.length;
                        if (matchCount >= baoBac) {
                            const winningPairsCount = combinationsCount(matchCount, baoBac);
                            const rate = BAO_KENO_RATES[baoBac] || 0;
                            const totalPairsInBet = combinationsCount(baoType, baoBac);
                            const baseCost = totalPairsInBet > 0 ? totalPairsInBet * 10000 : 10000;
                            const multiplierCount = Math.max(1, Math.round(board.cost / baseCost));
                            const boardPrize = winningPairsCount * (rate * 10000) * multiplierCount;
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                    });
                }
                else {
                    // Keno Cơ Bản & Chẵn Lẻ - Lớn Nhỏ
                    const drawNumbers = new Set(draw.winningNumbers);
                    let lonCount = 0, nhoCount = 0, chanCount = 0, leCount = 0;
                    draw.winningNumbers.forEach(n => {
                        const num = parseInt(n, 10);
                        if (num >= 41 && num <= 80)
                            lonCount++;
                        if (num >= 1 && num <= 40)
                            nhoCount++;
                        if (num % 2 === 0)
                            chanCount++;
                        if (num % 2 !== 0)
                            leCount++;
                    });
                    allBoards.forEach((board) => {
                        let matchCount = 0;
                        let boardPrize = 0;
                        const bac = board.numbers.length;
                        const numStr1 = board.numbers[0];
                        if (bac === 1 && isNaN(parseInt(numStr1, 10))) {
                            // Chẵn Lẻ - Lớn Nhỏ logic
                            const betType = numStr1;
                            if (betType === 'Lớn' && lonCount >= 13)
                                boardPrize = (lonCount >= 15 ? 200000 : 40000);
                            else if (betType === 'Hòa LN' && lonCount === 10 && nhoCount === 10)
                                boardPrize = 26000;
                            else if (betType === 'Nhỏ' && nhoCount >= 13)
                                boardPrize = (nhoCount >= 15 ? 200000 : 40000);
                            else if (betType === 'Lớn 11-12' && (lonCount === 11 || lonCount === 12))
                                boardPrize = 20000;
                            else if (betType === 'Nhỏ 11-12' && (nhoCount === 11 || nhoCount === 12))
                                boardPrize = 20000;
                            else if (betType === 'Chẵn' && chanCount >= 13)
                                boardPrize = (chanCount >= 15 ? 200000 : 40000);
                            else if (betType === 'Hòa CL' && chanCount === 10 && leCount === 10)
                                boardPrize = 26000;
                            else if (betType === 'Lẻ' && leCount >= 13)
                                boardPrize = (leCount >= 15 ? 200000 : 40000);
                            else if (betType === 'Chẵn 11-12' && (chanCount === 11 || chanCount === 12))
                                boardPrize = 20000;
                            else if (betType === 'Lẻ 11-12' && (leCount === 11 || leCount === 12))
                                boardPrize = 20000;
                        }
                        else {
                            // Keno Cơ Bản
                            board.numbers.forEach((numStr) => {
                                if (drawNumbers.has(numStr))
                                    matchCount++;
                            });
                            if (bac === 1 && matchCount === 1)
                                boardPrize = 30000;
                            else if (bac === 2 && matchCount === 2)
                                boardPrize = 100000;
                            else if (bac === 3) {
                                if (matchCount === 2)
                                    boardPrize = 30000;
                                if (matchCount === 3)
                                    boardPrize = 200000;
                            }
                            else if (bac === 4) {
                                if (matchCount === 2)
                                    boardPrize = 20000;
                                if (matchCount === 3)
                                    boardPrize = 50000;
                                if (matchCount === 4)
                                    boardPrize = 410000;
                            }
                            else if (bac === 5) {
                                if (matchCount === 3)
                                    boardPrize = 20000;
                                if (matchCount === 4)
                                    boardPrize = 160000;
                                if (matchCount === 5)
                                    boardPrize = 4410000;
                            }
                            else if (bac === 6) {
                                if (matchCount === 3)
                                    boardPrize = 20000;
                                if (matchCount === 4)
                                    boardPrize = 50000;
                                if (matchCount === 5)
                                    boardPrize = 460000;
                                if (matchCount === 6)
                                    boardPrize = 12510000;
                            }
                            else if (bac === 7) {
                                if (matchCount === 4)
                                    boardPrize = 30000;
                                if (matchCount === 5)
                                    boardPrize = 110000;
                                if (matchCount === 6)
                                    boardPrize = 1210000;
                                if (matchCount === 7)
                                    boardPrize = 40010000;
                            }
                            else if (bac === 8) {
                                if (matchCount === 0)
                                    boardPrize = 10000;
                                if (matchCount === 5)
                                    boardPrize = 60000;
                                if (matchCount === 6)
                                    boardPrize = 510000;
                                if (matchCount === 7)
                                    boardPrize = 5010000;
                                if (matchCount === 8)
                                    boardPrize = 200010000;
                            }
                            else if (bac === 9) {
                                if (matchCount === 0)
                                    boardPrize = 10000;
                                if (matchCount === 5)
                                    boardPrize = 20000;
                                if (matchCount === 6)
                                    boardPrize = 160000;
                                if (matchCount === 7)
                                    boardPrize = 1510000;
                                if (matchCount === 8)
                                    boardPrize = 12010000;
                                if (matchCount === 9)
                                    boardPrize = 800010000;
                            }
                            else if (bac === 10) {
                                if (matchCount === 0)
                                    boardPrize = 10000;
                                if (matchCount === 5)
                                    boardPrize = 20000;
                                if (matchCount === 6)
                                    boardPrize = 30000;
                                if (matchCount === 7)
                                    boardPrize = 50000;
                                if (matchCount === 8)
                                    boardPrize = 1000000;
                                if (matchCount === 9)
                                    boardPrize = 100010000;
                                if (matchCount === 10)
                                    boardPrize = jackpotPrizePerWinner;
                            }
                        }
                        if (boardPrize > 0) {
                            isWinner = true;
                            const multiplier = Math.floor(board.cost / 10000);
                            prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
                        }
                    });
                }
            }
            else if (game.type === 'vietlott') {
                if (game.code === 'max_3d' || game.code === 'max_3d_pro') {
                    const w = draw.winningNumbers;
                    if (w && w.length >= 20) {
                        const dacBiet = w.slice(0, 2);
                        const nhat = w.slice(2, 6);
                        const nhi = w.slice(6, 12);
                        const ba = w.slice(12, 20);
                        const otherPrizes = [...nhat, ...nhi, ...ba];
                        const allPrizes = [...dacBiet, ...otherPrizes];
                        const hasTwoMatches = (n1, n2, pool) => {
                            if (n1 === n2)
                                return pool.filter(x => x === n1).length >= 2;
                            return pool.includes(n1) && pool.includes(n2);
                        };
                        allBoards.forEach((board) => {
                            let boardPrize = 0;
                            const num1 = board.numbers.slice(0, 3).join('');
                            const num2 = board.numbers.length === 6 ? board.numbers.slice(3, 6).join('') : null;
                            const playType = board.playType || 'Max3D'; // Default
                            if (playType === 'Max3D') {
                                boardPrize += dacBiet.filter(x => x === num1).length * 1000000;
                                boardPrize += nhat.filter(x => x === num1).length * 350000;
                                boardPrize += nhi.filter(x => x === num1).length * 210000;
                                boardPrize += ba.filter(x => x === num1).length * 100000;
                            }
                            else if (playType === 'Max3D+') {
                                if (num1 && num2) {
                                    if (hasTwoMatches(num1, num2, dacBiet))
                                        boardPrize = 1000000000;
                                    else if (hasTwoMatches(num1, num2, nhat))
                                        boardPrize = 40000000;
                                    else if (hasTwoMatches(num1, num2, nhi))
                                        boardPrize = 10000000;
                                    else if (hasTwoMatches(num1, num2, ba))
                                        boardPrize = 5000000;
                                    else if ((dacBiet.includes(num1) && otherPrizes.includes(num2)) || (dacBiet.includes(num2) && otherPrizes.includes(num1))) {
                                        boardPrize = 100000;
                                    }
                                    else if (hasTwoMatches(num1, num2, otherPrizes)) {
                                        boardPrize = 40000;
                                    }
                                    else if (otherPrizes.includes(num1) || otherPrizes.includes(num2)) {
                                        // Trúng 1 bộ thuộc Nhất, Nhì, Ba (bộ còn lại trật)
                                        boardPrize = 40000;
                                    }
                                }
                            }
                            else if (playType === 'Max3D Pro') {
                                if (num1 && num2) {
                                    if (num1 === dacBiet[0] && num2 === dacBiet[1])
                                        boardPrize = 2000000000;
                                    else if (num1 === dacBiet[1] && num2 === dacBiet[0])
                                        boardPrize = 400000000;
                                    else if (hasTwoMatches(num1, num2, nhat))
                                        boardPrize = 30000000;
                                    else if (hasTwoMatches(num1, num2, nhi))
                                        boardPrize = 10000000;
                                    else if (hasTwoMatches(num1, num2, ba))
                                        boardPrize = 4000000;
                                    else if ((dacBiet.includes(num1) && otherPrizes.includes(num2)) || (dacBiet.includes(num2) && otherPrizes.includes(num1))) {
                                        boardPrize = 1000000;
                                    }
                                    else if (hasTwoMatches(num1, num2, otherPrizes)) {
                                        boardPrize = 100000;
                                    }
                                    else if (otherPrizes.includes(num1) || otherPrizes.includes(num2)) {
                                        boardPrize = 40000;
                                    }
                                }
                            }
                            if (boardPrize > 0) {
                                isWinner = true;
                                const multiplier = Math.floor(board.cost / 10000);
                                prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
                            }
                        });
                    }
                }
                else if (game.code === 'max_4d') {
                    const w = draw.winningNumbers;
                    if (w && w.length >= 6) {
                        const nhat = w[0];
                        const nhi = w.slice(1, 3);
                        const ba = w.slice(3, 6);
                        allBoards.forEach((board) => {
                            let boardPrize = 0;
                            const numStr = board.numbers.join('');
                            if (numStr.length === 4) {
                                if (numStr === nhat) {
                                    boardPrize = 15000000;
                                }
                                else if (nhi.includes(numStr)) {
                                    boardPrize = 6500000;
                                }
                                else if (ba.includes(numStr)) {
                                    boardPrize = 3000000;
                                }
                                else if (numStr.slice(1) === nhat.slice(1)) {
                                    // Khuyến khích 1: Khớp 3 chữ số cuối giải Nhất
                                    boardPrize = 1000000;
                                }
                                else if (numStr.slice(2) === nhat.slice(2)) {
                                    // Khuyến khích 2: Khớp 2 chữ số cuối giải Nhất
                                    boardPrize = 100000;
                                }
                            }
                            if (boardPrize > 0) {
                                isWinner = true;
                                const multiplier = Math.floor(board.cost / 10000);
                                prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
                            }
                        });
                    }
                }
                else if (game.code === 'lotto_535') {
                    const w = draw.winningNumbers;
                    if (w && w.length >= 6) {
                        const drawMain = w.slice(0, 5);
                        const drawSpecial = w[5];
                        allBoards.forEach((board) => {
                            let boardPrize = 0;
                            let subTickets = [];
                            const mainPool = board.numbers || [];
                            const specialPool = board.specialNumbers || [];
                            if (mainPool.length === 4) {
                                // Bao 4
                                for (let i = 1; i <= 35; i++) {
                                    const num = String(i).padStart(2, '0');
                                    if (!mainPool.includes(num)) {
                                        specialPool.forEach((s) => {
                                            subTickets.push({ main: [...mainPool, num], special: s });
                                        });
                                    }
                                }
                            }
                            else {
                                // Cơ bản, Bao 6-15, Bao số ĐB
                                const combinations = getCombinationsList(mainPool, 5);
                                combinations.forEach((combo) => {
                                    specialPool.forEach((s) => {
                                        subTickets.push({ main: combo, special: s });
                                    });
                                });
                            }
                            subTickets.forEach((ticket) => {
                                let matchCount = 0;
                                let hasSpecial = ticket.special === drawSpecial;
                                ticket.main.forEach((num) => {
                                    if (drawMain.includes(num))
                                        matchCount++;
                                });
                                if (matchCount === 5 && hasSpecial)
                                    boardPrize += 3000000000;
                                else if (matchCount === 5 && !hasSpecial)
                                    boardPrize += 10000000;
                                else if (matchCount === 4 && hasSpecial)
                                    boardPrize += 5000000;
                                else if (matchCount === 4 && !hasSpecial)
                                    boardPrize += 500000;
                                else if (matchCount === 3 && hasSpecial)
                                    boardPrize += 100000;
                                else if (matchCount === 3 && !hasSpecial)
                                    boardPrize += 30000;
                                else if (matchCount >= 0 && matchCount <= 2 && hasSpecial)
                                    boardPrize += 10000;
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                const multiplier = Math.floor(board.cost / (subTickets.length > 0 ? subTickets.length : 1) / 10000);
                                prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
                            }
                        });
                    }
                }
                else if (game.code === 'lotto_570') {
                    const w = draw.winningNumbers;
                    if (w && w.length >= 6) {
                        const drawMain = w.slice(0, 5);
                        const drawSpecial = w[5];
                        allBoards.forEach((board) => {
                            let boardPrize = 0;
                            let subTickets = [];
                            const mainPool = board.numbers || [];
                            const specialPool = board.specialNumbers || [];
                            if (mainPool.length === 4) {
                                // Bao 4
                                for (let i = 1; i <= 70; i++) {
                                    const num = String(i).padStart(2, '0');
                                    if (!mainPool.includes(num)) {
                                        specialPool.forEach((s) => {
                                            subTickets.push({ main: [...mainPool, num], special: s });
                                        });
                                    }
                                }
                            }
                            else {
                                // Cơ bản, Bao 6-15, Bao số ĐB
                                const combinations = getCombinationsList(mainPool, 5);
                                combinations.forEach((combo) => {
                                    specialPool.forEach((s) => {
                                        subTickets.push({ main: combo, special: s });
                                    });
                                });
                            }
                            subTickets.forEach((ticket) => {
                                let matchCount = 0;
                                let hasSpecial = ticket.special === drawSpecial;
                                ticket.main.forEach((num) => {
                                    if (drawMain.includes(num))
                                        matchCount++;
                                });
                                if (matchCount === 5 && hasSpecial)
                                    boardPrize += 6000000000;
                                else if (matchCount === 5 && !hasSpecial)
                                    boardPrize += 10000000;
                                else if (matchCount === 4 && hasSpecial)
                                    boardPrize += 10000000;
                                else if (matchCount === 4 && !hasSpecial)
                                    boardPrize += 9000000;
                                else if (matchCount === 3 && hasSpecial)
                                    boardPrize += 5000000;
                                else if (matchCount === 3 && !hasSpecial)
                                    boardPrize += 5000000;
                                else if (matchCount === 2 && hasSpecial)
                                    boardPrize += 1000000;
                                else if (matchCount === 1 && hasSpecial)
                                    boardPrize += 100000;
                                else if (matchCount === 0 && hasSpecial)
                                    boardPrize += 10000;
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                const multiplier = Math.floor(board.cost / (subTickets.length > 0 ? subTickets.length : 1) / 10000);
                                prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
                            }
                        });
                    }
                }
                else {
                    const specialNumber = draw.winningNumbers.length > 6 ? draw.winningNumbers[6] : null;
                    allBoards.forEach((board) => {
                        let matchCount = 0;
                        let hasSpecial = false;
                        board.numbers.forEach((numStr) => {
                            if (draw.winningNumbers.slice(0, 6).includes(numStr))
                                matchCount++;
                            else if (specialNumber && numStr === specialNumber)
                                hasSpecial = true;
                        });
                        let boardPrize = 0;
                        if (game.code === 'mega_645') {
                            if (matchCount === 3)
                                boardPrize = 30000;
                            else if (matchCount === 4)
                                boardPrize = 300000;
                            else if (matchCount === 5)
                                boardPrize = 10000000;
                            else if (matchCount >= 6)
                                boardPrize = 800000000; // Jackpot: 800 Triệu
                        }
                        else if (game.code === 'power_655') {
                            if (matchCount === 3)
                                boardPrize = 50000;
                            else if (matchCount === 4)
                                boardPrize = 500000;
                            else if (matchCount === 5 && !hasSpecial)
                                boardPrize = 40000000;
                            else if (matchCount === 5 && hasSpecial)
                                boardPrize = 1500000000; // Jackpot 2: 1.5 Tỷ
                            else if (matchCount === 6)
                                boardPrize = 2000000000; // Jackpot 1: 2 Tỷ
                        }
                        else {
                            if (matchCount >= 3)
                                boardPrize = 100000; // Fallback MVP
                        }
                        if (boardPrize > 0) {
                            isWinner = true;
                            const multiplier = Math.floor(board.cost / 10000);
                            prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
                        }
                    });
                }
            }
            else if (game.type === 'kienthiet' || game.type === 'lode') {
                const w = draw.winningNumbers;
                if (w && w.length >= 9) {
                    allBoards.forEach((board) => {
                        const currentPlayType = (board.playType || order.playType || '').trim();
                        // Chuẩn hóa tên loại cược (bỏ các chú thích trong ngoặc như "(Miền Bắc)", "(An Giang)")
                        const cleanPlayType = currentPlayType.replace(/\s*\(.*?\)\s*/g, '').trim();
                        const pTypeLower = cleanPlayType.toLowerCase();
                        const isMB = game.code === 'MB' ||
                            (order.gameType && order.gameType.toUpperCase() === 'MB') ||
                            (order.provinceName && /miền bắc|hà nội|mb/i.test(order.provinceName));
                        const getLodeMultiplier = (pType) => {
                            const p = pType.toLowerCase();
                            if (p === 'lô 2 số' || p === 'lô 2 số đầu')
                                return isMB ? 27 : 18;
                            if (p === 'lô giải 3' || p === 'lô giải 5')
                                return 6;
                            if (p === 'lô giải 4')
                                return 7;
                            if (p === 'lô giải 6')
                                return 3;
                            if (p === 'lô 3 số')
                                return isMB ? 23 : 17;
                            if (p === 'lô 4 số')
                                return isMB ? 20 : 16;
                            if (p === 'đề đầu' || p === 'đề đuôi')
                                return 10;
                            if (p === 'đề đầu đuôi')
                                return isMB ? 5 : 2;
                            if (p === 'đề giải 7')
                                return 4;
                            if (p === '3 càng giải 6')
                                return 3;
                            if (p === '3 càng đầu đuôi')
                                return isMB ? 4 : 2;
                            return 1;
                        };
                        const mult = getLodeMultiplier(cleanPlayType);
                        const numCount = board.numbers && board.numbers.length > 0 ? board.numbers.length : 1;
                        const baseCost = (board.baseCost && board.baseCost > 0)
                            ? board.baseCost
                            : Math.max(1000, Math.round(board.cost / numCount / mult));
                        const betPerNum = baseCost;
                        const allLast2 = w.map((n) => (n || '').slice(-2));
                        const allFirst2 = w.map((n) => (n || '').slice(0, 2));
                        const allLast3 = w.filter((n) => (n || '').length >= 3).map((n) => n.slice(-3));
                        const allLast4 = w.filter((n) => (n || '').length >= 4).map((n) => n.slice(-4));
                        let g3Pool = [];
                        let g4Pool = [];
                        let g5Pool = [];
                        let g6Pool = [];
                        let g7Pool = [];
                        let g8Pool = [];
                        if (isMB) {
                            if (w.length >= 27) {
                                g3Pool = [w[4], w[5], w[6], w[7], w[8], w[9]];
                                g4Pool = [w[10], w[11], w[12], w[13]];
                                g5Pool = [w[14], w[15], w[16], w[17], w[18], w[19]];
                                g6Pool = [w[20], w[21], w[22]];
                                g7Pool = [w[23], w[24], w[25], w[26]];
                            }
                            else if (w.length >= 9) {
                                g3Pool = [w[3]];
                                g4Pool = [w[4]];
                                g5Pool = [w[5]];
                                g6Pool = [w[6]];
                                g7Pool = [w[7]];
                            }
                        }
                        else {
                            if (w.length >= 18) {
                                g3Pool = [w[3], w[4]];
                                g4Pool = [w[5], w[6], w[7], w[8], w[9], w[10], w[11]];
                                g5Pool = [w[12]];
                                g6Pool = [w[13], w[14], w[15]];
                                g7Pool = [w[16]];
                                g8Pool = [w[17]];
                            }
                            else if (w.length >= 9) {
                                g3Pool = [w[3]];
                                g4Pool = [w[4]];
                                g5Pool = [w[5]];
                                g6Pool = [w[6]];
                                g7Pool = [w[7]];
                                g8Pool = [w[8]];
                            }
                        }
                        // 1. Xiên ĐB (Đọc tỉ lệ động từ game.payoutRates hoặc fallback 4.8)
                        if (pTypeLower === 'xiên đb' || pTypeLower === 'xien db') {
                            const rate = (game.payoutRates && (game.payoutRates['Xiên ĐB'] || game.payoutRates['xien_db'])) ?? 4.8;
                            const specialLast2 = (w[0] || '').slice(-2);
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (specialLast2.includes(numStr)) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 2. Xiên giải 1 (Đọc tỉ lệ động từ game.payoutRates hoặc fallback 4.8)
                        else if (pTypeLower === 'xiên giải 1' || pTypeLower === 'xien giai 1') {
                            const rate = (game.payoutRates && (game.payoutRates['Xiên giải 1'] || game.payoutRates['xien_g1'])) ?? 4.8;
                            const g1Last2 = (w[1] || '').slice(-2);
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (g1Last2.includes(numStr)) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 2.1. Xiên 3 càng ĐB (Tỉ lệ 1 ăn 3.2)
                        else if (pTypeLower === 'xiên 3 càng đb' || pTypeLower === 'xien 3 cang db') {
                            const rate = (game.payoutRates && (game.payoutRates['Xiên 3 càng ĐB'] || game.payoutRates['xien_3cang_db'])) ?? 3.2;
                            const specialLast3 = (w[0] || '').slice(-3);
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (specialLast3.includes(numStr)) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 2.2. Xiên 3 càng giải 1 (Tỉ lệ 1 ăn 3.2)
                        else if (pTypeLower === 'xiên 3 càng giải 1' || pTypeLower === 'xien 3 cang giai 1') {
                            const rate = (game.payoutRates && (game.payoutRates['Xiên 3 càng giải 1'] || game.payoutRates['xien_3cang_g1'])) ?? 3.2;
                            const g1Last3 = (w[1] || '').slice(-3);
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (g1Last3.includes(numStr)) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 2.3. Xiên 4 càng ĐB (Tỉ lệ 1 ăn 2.4)
                        else if (pTypeLower === 'xiên 4 càng đb' || pTypeLower === 'xien 4 cang db') {
                            const rate = (game.payoutRates && (game.payoutRates['Xiên 4 càng ĐB'] || game.payoutRates['xien_4cang_db'])) ?? 2.4;
                            const specialLast4 = (w[0] || '').slice(-4);
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (specialLast4.includes(numStr)) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 2.4. Xiên 4 càng giải 1 (Tỉ lệ 1 ăn 2.4)
                        else if (pTypeLower === 'xiên 4 càng giải 1' || pTypeLower === 'xien 4 cang giai 1') {
                            const rate = (game.payoutRates && (game.payoutRates['Xiên 4 càng giải 1'] || game.payoutRates['xien_4cang_g1'])) ?? 2.4;
                            const g1Last4 = (w[1] || '').slice(-4);
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (g1Last4.includes(numStr)) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 2.5. 4 Càng ĐB (Tỉ lệ 1 ăn 9000)
                        else if (pTypeLower === '4 càng đb' || pTypeLower === '4 cang db' || pTypeLower === '4 càng' || pTypeLower === '4 cang') {
                            const rate = (game.payoutRates && (game.payoutRates['4 Càng ĐB'] || game.payoutRates['4_cang_db'])) ?? 9000;
                            const specialLast4 = (w[0] || '').slice(-4);
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (numStr === specialLast4) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 2.6. 4 Càng đầu ĐB (Tỉ lệ 1 ăn 9000)
                        else if (pTypeLower === '4 càng đầu đb' || pTypeLower === '4 cang dau db') {
                            const rate = (game.payoutRates && (game.payoutRates['4 Càng đầu ĐB'] || game.payoutRates['4_cang_dau_db'])) ?? 9000;
                            const specialFirst4 = (w[0] || '').slice(0, 4);
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (numStr === specialFirst4) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 2.7. 4 Càng giải 1 (Tỉ lệ 1 ăn 9000)
                        else if (pTypeLower === '4 càng giải 1' || pTypeLower === '4 cang giai 1') {
                            const rate = (game.payoutRates && (game.payoutRates['4 Càng giải 1'] || game.payoutRates['4_cang_g1'])) ?? 9000;
                            const g1Last4 = (w[1] || '').slice(-4);
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (numStr === g1Last4) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 2.8. 4 Càng đầu giải 1 (Tỉ lệ 1 ăn 9000)
                        else if (pTypeLower === '4 càng đầu giải 1' || pTypeLower === '4 cang dau giai 1') {
                            const rate = (game.payoutRates && (game.payoutRates['4 Càng đầu giải 1'] || game.payoutRates['4_cang_dau_g1'])) ?? 9000;
                            const g1First4 = (w[1] || '').slice(0, 4);
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (numStr === g1First4) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 2.9. 3 Càng ĐB (Tỉ lệ 1 ăn 980)
                        else if (pTypeLower === '3 càng đb' || pTypeLower === '3 cang db' || pTypeLower === '3 càng' || pTypeLower === '3 cang') {
                            const rate = (game.payoutRates && (game.payoutRates['3 Càng ĐB'] || game.payoutRates['3_cang_db'])) ?? 980;
                            const specialLast3 = (w[0] || '').slice(-3);
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (numStr === specialLast3) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 2.10. 3 Càng đầu ĐB (Tỉ lệ 1 ăn 980)
                        else if (pTypeLower === '3 càng đầu đb' || pTypeLower === '3 cang dau db') {
                            const rate = (game.payoutRates && (game.payoutRates['3 Càng đầu ĐB'] || game.payoutRates['3_cang_dau_db'])) ?? 980;
                            const specialFirst3 = (w[0] || '').slice(0, 3);
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (numStr === specialFirst3) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 2.11. 3 Càng giải 1 (Tỉ lệ 1 ăn 980)
                        else if (pTypeLower === '3 càng giải 1' || pTypeLower === '3 cang giai 1') {
                            const rate = (game.payoutRates && (game.payoutRates['3 Càng giải 1'] || game.payoutRates['3_cang_g1'])) ?? 980;
                            const g1Last3 = (w[1] || '').slice(-3);
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (numStr === g1Last3) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 2.12. 3 Càng đầu giải 1 (Tỉ lệ 1 ăn 980)
                        else if (pTypeLower === '3 càng đầu giải 1' || pTypeLower === '3 cang dau giai 1') {
                            const rate = (game.payoutRates && (game.payoutRates['3 Càng đầu giải 1'] || game.payoutRates['3_cang_dau_g1'])) ?? 980;
                            const g1First3 = (w[1] || '').slice(0, 3);
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (numStr === g1First3) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 2.13. 3 Càng giải 6 (MB)
                        else if (pTypeLower === '3 càng giải 6' || pTypeLower === '3 cang giai 6') {
                            const rate = (game.payoutRates && (game.payoutRates['3 Càng giải 6'] || game.payoutRates['3_cang_g6'])) ?? 980;
                            const g6Last3 = g6Pool.map(n => (n || '').slice(-3));
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                const hitCount = g6Last3.filter(n => n === numStr).length;
                                if (hitCount > 0) {
                                    boardPrize += hitCount * Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 2.14. 3 Càng giải 7 (MN/MT)
                        else if (pTypeLower === '3 càng giải 7' || pTypeLower === '3 cang giai 7') {
                            const rate = (game.payoutRates && (game.payoutRates['3 Càng giải 7'] || game.payoutRates['3_cang_g7'])) ?? 980;
                            const g7Last3 = (g7Pool[0] || '').slice(-3);
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (numStr === g7Last3) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 2.15. 3 Càng đầu đuôi
                        else if (pTypeLower === '3 càng đầu đuôi' || pTypeLower === '3 cang dau duoi') {
                            const rate = (game.payoutRates && (game.payoutRates['3 Càng đầu đuôi'] || game.payoutRates['3_cang_dau_duoi'])) ?? 980;
                            const specialLast3 = (w[0] || '').slice(-3);
                            const otherLast3 = isMB ? g6Pool.map(n => (n || '').slice(-3)) : [(g7Pool[0] || '').slice(-3)];
                            const all3Targets = [specialLast3, ...otherLast3];
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                const hitCount = all3Targets.filter(n => n === numStr).length;
                                if (hitCount > 0) {
                                    boardPrize += hitCount * Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 3. Đề ĐB (Tỉ lệ 1 ăn 99.9)
                        else if (pTypeLower === 'đề đb' || pTypeLower === 'de db') {
                            const specialLast2 = (w[0] || '').slice(-2);
                            const rate = (game.payoutRates && (game.payoutRates['Đề ĐB'] || game.payoutRates['de_db'])) ?? 99.9;
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (numStr === specialLast2) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 3.1. Đề Đầu ĐB (Tỉ lệ 1 ăn 99.9)
                        else if (pTypeLower === 'đề đầu đb' || pTypeLower === 'de dau db') {
                            const specialFirst2 = (w[0] || '').slice(0, 2);
                            const rate = (game.payoutRates && (game.payoutRates['Đề Đầu ĐB'] || game.payoutRates['de_dau_db'])) ?? 99.9;
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (numStr === specialFirst2) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4. Đề giải 1 (Tỉ lệ 1 ăn 99.9)
                        else if (pTypeLower === 'đề giải 1' || pTypeLower === 'de giai 1') {
                            const g1Last2 = (w[1] || '').slice(-2);
                            const rate = (game.payoutRates && (game.payoutRates['Đề giải 1'] || game.payoutRates['de_giai_1'])) ?? 99.9;
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (numStr === g1Last2) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.1. Đề đầu giải 1 (Tỉ lệ 1 ăn 99.9)
                        else if (pTypeLower === 'đề đầu giải 1' || pTypeLower === 'de dau giai 1') {
                            const g1First2 = (w[1] || '').slice(0, 2);
                            const rate = (game.payoutRates && (game.payoutRates['Đề đầu giải 1'] || game.payoutRates['de_dau_g1'])) ?? 99.9;
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (numStr === g1First2) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.2. Đề giải 7 (MB)
                        else if (pTypeLower === 'đề giải 7' || pTypeLower === 'de giai 7') {
                            const g7Last2 = g7Pool.map(n => (n || '').slice(-2));
                            const rate = (game.payoutRates && (game.payoutRates['Đề giải 7'] || game.payoutRates['de_g7'])) ?? 99.9;
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                const hitCount = g7Last2.filter(n => n === numStr).length;
                                if (hitCount > 0) {
                                    boardPrize += hitCount * Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.3. Đề giải 8 (MN/MT)
                        else if (pTypeLower === 'đề giải 8' || pTypeLower === 'de giai 8') {
                            const g8Last2 = (g8Pool[0] || (w[w.length - 1] || '')).slice(-2);
                            const rate = (game.payoutRates && (game.payoutRates['Đề giải 8'] || game.payoutRates['de_g8'])) ?? 99.9;
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (numStr === g8Last2) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.4. Đề đầu (Chữ số hàng chục của giải ĐB)
                        else if (pTypeLower === 'đề đầu' || pTypeLower === 'de dau') {
                            const specialChuc = (w[0] || '').slice(-2, -1);
                            const rate = (game.payoutRates && (game.payoutRates['Đề đầu'] || game.payoutRates['de_dau'])) ?? 99.9;
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (numStr === specialChuc) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.5. Đề đuôi (Chữ số hàng đơn vị của giải ĐB)
                        else if (pTypeLower === 'đề đuôi' || pTypeLower === 'de duoi') {
                            const specialDonVi = (w[0] || '').slice(-1);
                            const rate = (game.payoutRates && (game.payoutRates['Đề đuôi'] || game.payoutRates['de_duoi'])) ?? 99.9;
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                if (numStr === specialDonVi) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.6. Đề đầu đuôi
                        else if (pTypeLower === 'đề đầu đuôi' || pTypeLower === 'de dau duoi') {
                            const specialLast2 = (w[0] || '').slice(-2);
                            const otherTargets = isMB ? g7Pool.map(n => (n || '').slice(-2)) : [(g8Pool[0] || (w[w.length - 1] || '')).slice(-2)];
                            const allTargets = [specialLast2, ...otherTargets];
                            const rate = (game.payoutRates && (game.payoutRates['Đề đầu đuôi'] || game.payoutRates['de_dau_duoi'])) ?? 99.9;
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                const hitCount = allTargets.filter(n => n === numStr).length;
                                if (hitCount > 0) {
                                    boardPrize += hitCount * Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.7. Lô 2 số (Bao lô 18 giải MN/MT hoặc 27 giải MB)
                        else if (pTypeLower === 'lô 2 số' || pTypeLower === 'lo 2 so') {
                            const rate = (game.payoutRates && (game.payoutRates['Lô 2 số'] || game.payoutRates['lo_2_so'])) ?? 99.9;
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                const hitCount = allLast2.filter(n => n === numStr).length;
                                if (hitCount > 0) {
                                    boardPrize += hitCount * Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.8. Lô 2 số đầu
                        else if (pTypeLower === 'lô 2 số đầu' || pTypeLower === 'lo 2 so dau') {
                            const rate = (game.payoutRates && (game.payoutRates['Lô 2 số đầu'] || game.payoutRates['lo_2_so_dau'])) ?? 99.9;
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                const hitCount = allFirst2.filter(n => n === numStr).length;
                                if (hitCount > 0) {
                                    boardPrize += hitCount * Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.9. Lô 2 số 1k
                        else if (pTypeLower === 'lô 2 số 1k' || pTypeLower === 'lo 2 so 1k') {
                            const defaultRate = isMB ? 3.7 : 5.445;
                            const rate = (game.payoutRates && (game.payoutRates['Lô 2 số 1k'] || game.payoutRates['lo_2_so_1k'])) ?? defaultRate;
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                const hitCount = allLast2.filter(n => n === numStr).length;
                                if (hitCount > 0) {
                                    boardPrize += hitCount * Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.10. Lô 2 số đầu 1k
                        else if (pTypeLower === 'lô 2 số đầu 1k' || pTypeLower === 'lo 2 so dau 1k') {
                            const defaultRate = isMB ? 3.7 : 5.445;
                            const rate = (game.payoutRates && (game.payoutRates['Lô 2 số đầu 1k'] || game.payoutRates['lo_2_so_dau_1k'])) ?? defaultRate;
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                const hitCount = allFirst2.filter(n => n === numStr).length;
                                if (hitCount > 0) {
                                    boardPrize += hitCount * Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.11. Lô Giải 3 (MB)
                        else if (pTypeLower === 'lô giải 3' || pTypeLower === 'lo giai 3') {
                            const rate = (game.payoutRates && (game.payoutRates['Lô Giải 3'] || game.payoutRates['lo_g3'])) ?? 99.9;
                            const g3Last2 = g3Pool.map(n => (n || '').slice(-2));
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                const hitCount = g3Last2.filter(n => n === numStr).length;
                                if (hitCount > 0) {
                                    boardPrize += hitCount * Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.12. Lô Giải 4 (MN/MT)
                        else if (pTypeLower === 'lô giải 4' || pTypeLower === 'lo giai 4') {
                            const rate = (game.payoutRates && (game.payoutRates['Lô Giải 4'] || game.payoutRates['lo_g4'])) ?? 99.9;
                            const g4Last2 = g4Pool.map(n => (n || '').slice(-2));
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                const hitCount = g4Last2.filter(n => n === numStr).length;
                                if (hitCount > 0) {
                                    boardPrize += hitCount * Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.13. Lô Giải 5 (MB)
                        else if (pTypeLower === 'lô giải 5' || pTypeLower === 'lo giai 5') {
                            const rate = (game.payoutRates && (game.payoutRates['Lô Giải 5'] || game.payoutRates['lo_g5'])) ?? 99.9;
                            const g5Last2 = g5Pool.map(n => (n || '').slice(-2));
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                const hitCount = g5Last2.filter(n => n === numStr).length;
                                if (hitCount > 0) {
                                    boardPrize += hitCount * Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.14. Lô Giải 6 (MN/MT)
                        else if (pTypeLower === 'lô giải 6' || pTypeLower === 'lo giai 6') {
                            const rate = (game.payoutRates && (game.payoutRates['Lô Giải 6'] || game.payoutRates['lo_g6'])) ?? 99.9;
                            const g6Last2 = g6Pool.map(n => (n || '').slice(-2));
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                const hitCount = g6Last2.filter(n => n === numStr).length;
                                if (hitCount > 0) {
                                    boardPrize += hitCount * Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.15. Lô 3 số
                        else if (pTypeLower === 'lô 3 số' || pTypeLower === 'lo 3 so') {
                            const rate = (game.payoutRates && (game.payoutRates['Lô 3 số'] || game.payoutRates['lo_3_so'])) ?? 980;
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                const hitCount = allLast3.filter(n => n === numStr).length;
                                if (hitCount > 0) {
                                    boardPrize += hitCount * Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.16. Lô 4 số
                        else if (pTypeLower === 'lô 4 số' || pTypeLower === 'lo 4 so') {
                            const rate = (game.payoutRates && (game.payoutRates['Lô 4 số'] || game.payoutRates['lo_4_so'])) ?? 9000;
                            let boardPrize = 0;
                            board.numbers.forEach((numStr) => {
                                const hitCount = allLast4.filter(n => n === numStr).length;
                                if (hitCount > 0) {
                                    boardPrize += hitCount * Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.17. Lô Xiên 2
                        else if (pTypeLower.startsWith('xiên 2') || pTypeLower.startsWith('xien 2')) {
                            const defaultRate = isMB ? 16 : 28;
                            const rate = (game.payoutRates && (game.payoutRates['Xiên 2'] || game.payoutRates['xien_2'])) ?? defaultRate;
                            let boardPrize = 0;
                            const combos = (board.numbers || []).some(n => n.includes('&'))
                                ? (board.numbers || []).map(s => s.split('&').map(x => x.trim()))
                                : [(board.numbers || []).map(x => x.trim())];
                            combos.forEach((pair) => {
                                if (pair.length >= 2 && pair.every(n => allLast2.includes(n))) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.18. Lô Xiên 3
                        else if (pTypeLower.startsWith('xiên 3') || pTypeLower.startsWith('xien 3')) {
                            const defaultRate = isMB ? 65 : 150;
                            const rate = (game.payoutRates && (game.payoutRates['Xiên 3'] || game.payoutRates['xien_3'])) ?? defaultRate;
                            let boardPrize = 0;
                            const combos = (board.numbers || []).some(n => n.includes('&'))
                                ? (board.numbers || []).map(s => s.split('&').map(x => x.trim()))
                                : [(board.numbers || []).map(x => x.trim())];
                            combos.forEach((trip) => {
                                if (trip.length >= 3 && trip.every(n => allLast2.includes(n))) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.19. Lô Xiên 4
                        else if (pTypeLower.startsWith('xiên 4') || pTypeLower.startsWith('xien 4')) {
                            const defaultRate = isMB ? 180 : 750;
                            const rate = (game.payoutRates && (game.payoutRates['Xiên 4'] || game.payoutRates['xien_4'])) ?? defaultRate;
                            let boardPrize = 0;
                            const combos = (board.numbers || []).some(n => n.includes('&'))
                                ? (board.numbers || []).map(s => s.split('&').map(x => x.trim()))
                                : [(board.numbers || []).map(x => x.trim())];
                            combos.forEach((quad) => {
                                if (quad.length >= 4 && quad.every(n => allLast2.includes(n))) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 4.20. Lô Trượt (Xiên 4, 6, 8, 10)
                        else if (pTypeLower.includes('trượt') || pTypeLower.includes('truot')) {
                            let defaultRate = 2.0;
                            if (pTypeLower.includes('4'))
                                defaultRate = isMB ? 2.3 : 1.8;
                            else if (pTypeLower.includes('6'))
                                defaultRate = isMB ? 4.5 : 2.5;
                            else if (pTypeLower.includes('8'))
                                defaultRate = isMB ? 8.0 : 3.3;
                            else if (pTypeLower.includes('10'))
                                defaultRate = isMB ? 12.0 : 4.3;
                            const rateKey = Object.keys(game.payoutRates || {}).find(k => k.toLowerCase() === pTypeLower) || '';
                            const rate = (rateKey && game.payoutRates[rateKey]) ? game.payoutRates[rateKey] : defaultRate;
                            let boardPrize = 0;
                            const combos = (board.numbers || []).some(n => n.includes('&'))
                                ? (board.numbers || []).map(s => s.split('&').map(x => x.trim()))
                                : [(board.numbers || []).map(x => x.trim())];
                            combos.forEach((nums) => {
                                if (nums.length > 0 && nums.every(n => !allLast2.includes(n))) {
                                    boardPrize += Math.round(betPerNum * rate);
                                }
                            });
                            if (boardPrize > 0) {
                                isWinner = true;
                                prizeAmount += boardPrize;
                            }
                        }
                        // 5. Vé số kiến thiết truyền thống (vé giấy 6 số)
                        else {
                            for (const ticketStr of board.numbers) {
                                const isWildcard = ticketStr.toLowerCase().startsWith('x');
                                const ticketNum = isWildcard ? ticketStr.slice(1) : ticketStr;
                                let ticketPrize = 0;
                                const g8Val = g8Pool[0] || (w.length >= 9 ? w[8] : w[w.length - 1]);
                                const g7Val = g7Pool[0] || (w.length >= 8 ? w[7] : '');
                                const g6Vals = g6Pool.length > 0 ? g6Pool : (w.length >= 7 ? [w[6]] : []);
                                const g5Val = g5Pool[0] || (w.length >= 6 ? w[5] : '');
                                const g4Vals = g4Pool.length > 0 ? g4Pool : (w.length >= 5 ? [w[4]] : []);
                                const g3Vals = g3Pool.length > 0 ? g3Pool : (w.length >= 4 ? [w[3]] : []);
                                const g2Vals = w.length >= 18 ? [w[2]] : (w.length >= 3 ? [w[2]] : []);
                                const g1Val = w[1] || '';
                                const gdbVal = w[0] || '';
                                if (g8Val && g8Val.endsWith(ticketNum.slice(-2)))
                                    ticketPrize += 100000;
                                if (g7Val && g7Val.endsWith(ticketNum.slice(-3)))
                                    ticketPrize += 200000;
                                if (g6Vals.some(v => v && v.endsWith(ticketNum.slice(-4))))
                                    ticketPrize += 400000;
                                if (g5Val && g5Val.endsWith(ticketNum.slice(-4)))
                                    ticketPrize += 1000000;
                                if (g4Vals.some(v => v && v.endsWith(ticketNum.slice(-5))))
                                    ticketPrize += 3000000;
                                if (g3Vals.some(v => v && v.endsWith(ticketNum.slice(-5))))
                                    ticketPrize += 10000000;
                                if (g2Vals.some(v => v && v.endsWith(ticketNum.slice(-5))))
                                    ticketPrize += 15000000;
                                if (g1Val && g1Val.endsWith(ticketNum.slice(-5)))
                                    ticketPrize += 30000000;
                                if (!isWildcard && ticketNum === gdbVal) {
                                    ticketPrize += 2000000000;
                                }
                                else if (gdbVal && gdbVal.endsWith(ticketNum.slice(-5))) {
                                    ticketPrize += 50000000;
                                }
                                if (ticketPrize > 0) {
                                    isWinner = true;
                                    const multiplier = Math.floor(board.cost / 10000);
                                    prizeAmount += ticketPrize * (multiplier > 0 ? multiplier : 1);
                                }
                            }
                        }
                    });
                }
            }
            else if (game.type === 'dientoan') {
                const w = draw.winningNumbers;
                if (w && w.length >= 9) {
                    const w2 = w.map(n => n.slice(-2)); // Get last 2 digits of all winning numbers
                    allBoards.forEach((board) => {
                        let ticketPrize = 0;
                        const multiplier = Math.floor(board.cost / 10000);
                        if (game.code === 'truot_loto') {
                            // Player wins if NONE of their selected numbers appear in the results (w2)
                            const allMissed = board.numbers.every(num => !w2.includes(num));
                            if (allMissed) {
                                if (order.playType === 'Trượt 4')
                                    ticketPrize = 25000; // x2.5
                                if (order.playType === 'Trượt 8')
                                    ticketPrize = 85000; // x8.5
                                if (order.playType === 'Trượt 10')
                                    ticketPrize = 120000; // x12
                            }
                        }
                        else if (game.code === 'loto_cap') {
                            // Player wins if ALL of their selected numbers appear in the results (w2)
                            const allHit = board.numbers.every(num => w2.includes(num));
                            if (allHit) {
                                const betAmount = board.cost || 10000;
                                if (order.playType === 'Lô tô 2 cặp')
                                    ticketPrize = betAmount * 15; // x15
                                if (order.playType === 'Lô tô 3 cặp')
                                    ticketPrize = betAmount * 65; // x65
                                if (order.playType === 'Lô tô 4 cặp')
                                    ticketPrize = betAmount * 170; // x170
                            }
                        }
                        else {
                            // loto_235 or standard games (evaluate per ticket)
                            board.numbers.forEach((ticketStr) => {
                                let singlePrize = 0;
                                if (game.code === 'loto_235' || game.code.includes('loto')) {
                                    const numLen = ticketStr.length;
                                    const betAmount = board.cost || 10000;
                                    if (order.playType?.includes('Bao 2 số') || order.playType?.includes('Bao lô tô 2') || game.code === 'bao_loto_2') {
                                        // Bao 2 số: Trúng 2 số cuối của 27 giải (x2.7)
                                        if (w.length >= 27 && numLen === 2) {
                                            for (let i = 0; i < 27; i++) {
                                                if (w[i]?.endsWith(ticketStr)) {
                                                    singlePrize += betAmount * 2.7;
                                                }
                                            }
                                        }
                                    }
                                    else if (order.playType === 'Lô tô 2 số' && numLen === 2) {
                                        // Trúng 2 số: x90
                                        if (w[0]?.length >= 5) {
                                            if (w[0].slice(-2) === ticketStr)
                                                singlePrize += betAmount * 90;
                                            if (w[0].slice(0, 2) === ticketStr)
                                                singlePrize += betAmount * 90;
                                        }
                                        if (w[1]?.length >= 5) {
                                            if (w[1].slice(-2) === ticketStr)
                                                singlePrize += betAmount * 90;
                                            if (w[1].slice(0, 2) === ticketStr)
                                                singlePrize += betAmount * 90;
                                        }
                                    }
                                    else if (order.playType === 'Lô tô 3 số' && numLen === 3) {
                                        // Trúng 3 số: x900
                                        if (w[0]?.length >= 5) {
                                            if (w[0].slice(-3) === ticketStr)
                                                singlePrize += betAmount * 900;
                                            if (w[0].slice(0, 3) === ticketStr)
                                                singlePrize += betAmount * 900;
                                        }
                                        if (w[1]?.length >= 5) {
                                            if (w[1].slice(-3) === ticketStr)
                                                singlePrize += betAmount * 900;
                                            if (w[1].slice(0, 3) === ticketStr)
                                                singlePrize += betAmount * 900;
                                        }
                                    }
                                    else if (order.playType === 'Lô tô 4 số' && numLen === 4) {
                                        // Trúng 4 số: x9000
                                        if (w[0]?.length >= 5) {
                                            if (w[0].slice(-4) === ticketStr)
                                                singlePrize += betAmount * 9000;
                                            if (w[0].slice(0, 4) === ticketStr)
                                                singlePrize += betAmount * 9000;
                                        }
                                        if (w[1]?.length >= 5) {
                                            if (w[1].slice(-4) === ticketStr)
                                                singlePrize += betAmount * 9000;
                                            if (w[1].slice(0, 4) === ticketStr)
                                                singlePrize += betAmount * 9000;
                                        }
                                    }
                                    else if (order.playType === 'Lô tô 5 số' && numLen === 5) {
                                        // Trúng 5 số: x90,000
                                        if (w[0] === ticketStr)
                                            singlePrize += betAmount * 90000;
                                        if (w[1] === ticketStr)
                                            singlePrize += betAmount * 90000;
                                    }
                                }
                                else {
                                    if (w2.includes(ticketStr))
                                        singlePrize = 10000;
                                }
                                ticketPrize += singlePrize;
                            });
                        }
                        if (ticketPrize > 0) {
                            isWinner = true;
                            prizeAmount += (game.code === 'loto_235' || game.code.includes('loto')) ? ticketPrize : ticketPrize * (multiplier > 0 ? multiplier : 1);
                        }
                    });
                }
            }
            else if (game.code === 'dientoan_636' || game.code === 'bao_636') {
                const w = draw.winningNumbers;
                if (w && w.length >= 6) {
                    const drawMain = w.slice(0, 6);
                    allBoards.forEach((board) => {
                        let boardPrize = 0;
                        let subTickets = [];
                        const mainPool = board.numbers || [];
                        if (mainPool.length === 4) {
                            // Bao 4: Chọn 4 số + 2 số ngẫu nhiên còn lại
                            const remaining = [];
                            for (let i = 1; i <= 36; i++) {
                                const num = String(i).padStart(2, '0');
                                if (!mainPool.includes(num))
                                    remaining.push(num);
                            }
                            const remainingCombos = getCombinationsList(remaining, 2);
                            remainingCombos.forEach((combo) => {
                                subTickets.push([...mainPool, ...combo]);
                            });
                        }
                        else if (mainPool.length === 5) {
                            // Bao 5: Chọn 5 số + 1 số ngẫu nhiên còn lại
                            for (let i = 1; i <= 36; i++) {
                                const num = String(i).padStart(2, '0');
                                if (!mainPool.includes(num)) {
                                    subTickets.push([...mainPool, num]);
                                }
                            }
                        }
                        else if (mainPool.length >= 6) {
                            // Cơ bản (6), Bao 7 -> Bao 12
                            const combinations = getCombinationsList(mainPool, 6);
                            combinations.forEach((combo) => {
                                subTickets.push(combo);
                            });
                        }
                        subTickets.forEach((ticket) => {
                            let matchCount = 0;
                            ticket.forEach((num) => {
                                if (drawMain.includes(num))
                                    matchCount++;
                            });
                            if (matchCount === 6)
                                boardPrize += 500000000;
                            else if (matchCount === 5)
                                boardPrize += 900000;
                            else if (matchCount === 4)
                                boardPrize += 450000;
                            else if (matchCount === 3)
                                boardPrize += 250000;
                            else if (matchCount === 2)
                                boardPrize += 25000;
                        });
                        if (boardPrize > 0) {
                            isWinner = true;
                            // cost per ticket is 5000 in frontend, so we derive multiplier
                            const multiplier = Math.floor(board.cost / (subTickets.length > 0 ? subTickets.length : 1) / 10000);
                            prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
                        }
                    });
                }
            }
            else if (game.code === 'than_tai_4') {
                const w = draw.winningNumbers;
                if (w && w.length >= 4) {
                    allBoards.forEach((board) => {
                        let boardPrize = 0;
                        const multiplier = Math.floor(board.cost / 10000);
                        if (order.playType === 'Thần tài 4') {
                            const ticketStr = board.numbers.join('');
                            const WXYZ = w[0];
                            if (ticketStr.length === 4 && WXYZ.length === 4) {
                                const A = ticketStr[0], B = ticketStr[1], C = ticketStr[2], D = ticketStr[3];
                                const W = WXYZ[0], X = WXYZ[1], Y = WXYZ[2], Z = WXYZ[3];
                                // Helper để kiểm tra hoán vị
                                const isPermutation = (s1, s2) => s1.split('').sort().join('') === s2.split('').sort().join('');
                                if (ticketStr === WXYZ) {
                                    boardPrize = 100000000;
                                }
                                else if (isPermutation(ticketStr, WXYZ)) {
                                    boardPrize = 10000000;
                                }
                                else if (B === X && C === Y && D === Z) {
                                    boardPrize = 1000000;
                                }
                                else if (isPermutation(B + C + D, X + Y + Z)) {
                                    boardPrize = 100000;
                                }
                                else if (A === W && B === X && C === Y) {
                                    boardPrize = 1000000;
                                }
                                else if (isPermutation(A + B + C, W + X + Y)) {
                                    boardPrize = 100000;
                                }
                                else if (C === Y && D === Z) {
                                    boardPrize = 100000;
                                }
                                else if (A === W && B === X) {
                                    boardPrize = 100000;
                                }
                                else if (D === Z || A === W) {
                                    boardPrize = 10000;
                                }
                            }
                        }
                        else if (order.playType === 'Điện toán 1-2-3') {
                            const ticketStr = board.numbers.join('');
                            if (ticketStr.length === 6) {
                                const A = ticketStr[0], BC = ticketStr.slice(1, 3), DEF = ticketStr.slice(3, 6);
                                const W = w[1][0] || w[1], XY = w[2].slice(-2), ZUV = w[3].slice(-3);
                                let prize3 = 0, prize2 = 0, prize1 = 0;
                                const isPerm = (s1, s2) => s1.split('').sort().join('') === s2.split('').sort().join('');
                                // Bộ 3 số
                                if (DEF === ZUV)
                                    prize3 = 10000000;
                                else if (isPerm(DEF, ZUV))
                                    prize3 = 1000000;
                                else if (DEF.slice(1) === ZUV.slice(1))
                                    prize3 = 100000;
                                else if (DEF.slice(2) === ZUV.slice(2))
                                    prize3 = 50000;
                                // Bộ 2 số
                                if (BC === XY)
                                    prize2 = 750000;
                                else if (BC.slice(1) === XY.slice(1))
                                    prize2 = 50000;
                                // Bộ 1 số
                                if (A === W)
                                    prize1 = 50000;
                                boardPrize = prize1 + prize2 + prize3;
                            }
                        }
                        if (boardPrize > 0) {
                            isWinner = true;
                            prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
                        }
                    });
                }
            }
            else if (game.code === 'bingo18') {
                const w = draw.winningNumbers;
                if (w && w.length === 3) {
                    const wInts = w.map(Number);
                    const wSum = wInts.reduce((a, b) => a + b, 0);
                    allBoards.forEach((board) => {
                        let boardPrize = 0;
                        const multiplier = Math.floor(board.cost / 10000);
                        board.numbers.forEach(bet => {
                            if (order.playType === 'Cơ bản') {
                                if (bet.length === 1) {
                                    const digit = Number(bet);
                                    const count = wInts.filter(n => n === digit).length;
                                    if (count === 1)
                                        boardPrize += 20000;
                                    if (count === 2)
                                        boardPrize += 30000;
                                    if (count === 3)
                                        boardPrize += 40000;
                                }
                                else if (bet.length === 2 && bet[0] === bet[1]) {
                                    const digit = Number(bet[0]);
                                    const count = wInts.filter(n => n === digit).length;
                                    if (count >= 2)
                                        boardPrize += 30000;
                                }
                                else if (bet.length === 3 && bet[0] === bet[1] && bet[1] === bet[2]) {
                                    const digit = Number(bet[0]);
                                    const count = wInts.filter(n => n === digit).length;
                                    if (count === 3)
                                        boardPrize += 40000;
                                }
                            }
                            else if (order.playType === 'Cộng tổng') {
                                const betSum = Number(bet);
                                if (wSum === betSum) {
                                    if (wSum === 3 || wSum === 18)
                                        boardPrize += 1200000;
                                    else if (wSum === 4 || wSum === 17)
                                        boardPrize += 400000;
                                    else if (wSum === 5 || wSum === 16)
                                        boardPrize += 200000;
                                    else if (wSum === 6 || wSum === 15)
                                        boardPrize += 120000;
                                    else if (wSum === 7 || wSum === 14)
                                        boardPrize += 80000;
                                    else if (wSum === 8 || wSum === 13)
                                        boardPrize += 60000;
                                    else if (wSum === 9 || wSum === 12)
                                        boardPrize += 60000;
                                    else if (wSum === 10 || wSum === 11)
                                        boardPrize += 50000;
                                }
                            }
                            else if (order.playType === 'Tài Xỉu Hoà') {
                                if (bet === 'Tài' && wSum >= 12 && wSum <= 18)
                                    boardPrize += 20000;
                                else if (bet === 'Xỉu' && wSum >= 3 && wSum <= 9)
                                    boardPrize += 20000;
                                else if (bet === 'Hoà' && (wSum === 10 || wSum === 11))
                                    boardPrize += 30000;
                            }
                        });
                        if (boardPrize > 0) {
                            isWinner = true;
                            prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
                        }
                    });
                }
            }
            // --- CẬP NHẬT TRẠNG THÁI ---
            order.status = 'completed';
            order.winningNumbers = draw.winningNumbers;
            if (isWinner && prizeAmount > 0) {
                order.isWinner = true;
                order.prizeAmount = prizeAmount;
                // Cộng tiền cho User (Không trừ phí thắng)
                const user = await User_1.default.findById(order.user);
                if (user) {
                    const finalPrize = prizeAmount;
                    const balanceBefore = user.balance;
                    user.balance += finalPrize;
                    const balanceAfter = user.balance;
                    await user.save();
                    await BalanceHistory_1.default.create({
                        user: user._id,
                        type: 'win',
                        amount: finalPrize,
                        balanceBefore,
                        balanceAfter,
                        description: `Trả thưởng cược vé ${order.orderId}`,
                        reference: order._id.toString()
                    });
                    // Ghi lại giao dịch với mã GD là mã vé và loại là thắng cược
                    await Transaction_1.default.create({
                        user: user._id,
                        type: 'win',
                        txId: order.orderId,
                        amount: finalPrize,
                        status: 'approved',
                        balanceBefore,
                        balanceAfter,
                        note: `Thắng cược vé ${order.orderId}`
                    });
                    // Tạo thông báo
                    await Notification_1.default.create({
                        user: user._id,
                        title: '🎉 CHÚC MỪNG TRÚNG THƯỞNG 🎉',
                        body: `Quý khách đã trúng thưởng vé thuộc kỳ quay ${draw.drawCode} (${game.name}). Tổng giá trị giải thưởng: ${finalPrize.toLocaleString('vi-VN')} đ`,
                        type: 'win',
                        category: 'important',
                        orderId: order._id.toString()
                    });
                    console.log(`PrizeService: User ${user.phone} TRÚNG THƯỞNG ${finalPrize}đ`);
                    const userName = user.name || 'Khách hàng';
                    const userPhone = user.phone ? EncryptionHelper_1.EncryptionHelper.decryptDeterministic(user.phone) : '';
                    await AdminLog_1.default.create({
                        targetUserId: user._id,
                        adminName: 'Hệ thống',
                        action: 'THẮNG CƯỢC',
                        details: `Vé #${order.orderId} TRÚNG THƯỞNG: +${finalPrize.toLocaleString('vi-VN')} đ. Khách hàng: ${userName}${userPhone ? ` (${userPhone})` : ''}. Kỳ quay: ${draw.drawCode} (${game.name || game.code}). Tiền cược: ${(order.totalCost || 0).toLocaleString('vi-VN')} đ.`
                    });
                }
            }
            else {
                order.isWinner = false;
                order.prizeAmount = 0;
                const user = await User_1.default.findById(order.user);
                const userName = user?.name || 'Khách hàng';
                const userPhone = user?.phone ? EncryptionHelper_1.EncryptionHelper.decryptDeterministic(user.phone) : '';
                await AdminLog_1.default.create({
                    targetUserId: (user?._id || order.user?._id || order.user),
                    adminName: 'Hệ thống',
                    action: 'THUA CƯỢC',
                    details: `Vé #${order.orderId} KHÔNG TRÚNG (THUA CƯỢC): -${(order.totalCost || 0).toLocaleString('vi-VN')} đ. Khách hàng: ${userName}${userPhone ? ` (${userPhone})` : ''}. Kỳ quay: ${draw.drawCode} (${game.name || game.code}).`
                });
            }
            await order.save();
        }
        console.log(`PrizeService: Hoàn tất dò vé cho kỳ quay ${draw.drawCode}.`);
    }
    catch (error) {
        console.error(`PrizeService Lỗi:`, error);
    }
};
exports.processDrawResults = processDrawResults;
