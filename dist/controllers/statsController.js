"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDrawStats = void 0;
const Draw_1 = __importDefault(require("../models/Draw"));
const Game_1 = __importDefault(require("../models/Game"));
const getDrawStats = async (req, res) => {
    try {
        const type = req.query.type;
        const limitParam = req.query.limit;
        const limit = limitParam === 'all' ? 0 : parseInt(limitParam) || 10;
        const tab = req.query.tab;
        const province = req.query.province;
        const prize = req.query.prize;
        if (!type) {
            return res.status(400).json({ message: 'Missing game type' });
        }
        let gameQuery = { type };
        // Mappings for dientoan and kienthiet based on type and tab
        if (type === 'dientoan') {
            if (tab === '235')
                gameQuery.code = 'loto_235';
            else if (tab === 'capSo')
                gameQuery.code = 'loto_cap';
            else if (tab === 'dt6x36')
                gameQuery.code = 'dientoan_636';
        }
        else if (type === 'kienthiet' || type === 'vietlott' || type === 'keno') {
            const code = req.query.code;
            if (code) {
                gameQuery.code = code;
            }
        }
        const matchingGames = await Game_1.default.find(gameQuery);
        const gameIds = matchingGames.map(g => g._id);
        if (gameIds.length === 0) {
            return res.status(404).json({ message: 'Game not found' });
        }
        let drawQuery = { status: 'completed', game: { $in: gameIds } };
        const { startDate, endDate } = req.query;
        if (startDate || endDate) {
            drawQuery.closeTime = {};
            if (startDate)
                drawQuery.closeTime.$gte = new Date(startDate);
            if (endDate)
                drawQuery.closeTime.$lte = new Date(endDate);
        }
        let drawsQueryObj = Draw_1.default.find(drawQuery).sort({ closeTime: -1 });
        if (limit > 0 && !startDate && !endDate) {
            drawsQueryObj = drawsQueryObj.limit(limit);
        }
        const draws = await drawsQueryObj.populate('game');
        // Stats Logic based on type
        if (type === 'vietlott' || type === 'keno') {
            let maxNum = 80;
            if (gameQuery.code === 'power_655')
                maxNum = 55;
            if (gameQuery.code === 'mega_645')
                maxNum = 45;
            const counts = Array(maxNum + 1).fill(0);
            draws.forEach(d => {
                (d.winningNumbers || []).forEach(nStr => {
                    const n = parseInt(nStr, 10);
                    if (!isNaN(n) && n <= maxNum && n >= 1)
                        counts[n]++;
                });
            });
            const stats = [];
            for (let i = 1; i <= maxNum; i++) {
                stats.push({ number: String(i).padStart(2, '0'), count: counts[i] });
            }
            stats.sort((a, b) => b.count - a.count);
            const reversed = [...stats].reverse();
            // Chan Le logic
            let kyRa = [0, 0, 0, 0, 0];
            let lastSeen = [-1, -1, -1, -1, -1]; // to calculate chuaVe
            // draws are sorted closeTime DESC (index 0 is latest)
            draws.forEach((d, idx) => {
                let evenCount = 0;
                let oddCount = 0;
                (d.winningNumbers || []).forEach(nStr => {
                    const n = parseInt(nStr, 10);
                    if (!isNaN(n)) {
                        if (n % 2 === 0)
                            evenCount++;
                        else
                            oddCount++;
                    }
                });
                let colIdx = -1;
                if (evenCount >= 13)
                    colIdx = 0;
                else if (evenCount >= 11)
                    colIdx = 1;
                else if (evenCount === 10 && oddCount === 10)
                    colIdx = 2;
                else if (oddCount >= 11 && oddCount <= 12)
                    colIdx = 3;
                else if (oddCount >= 13)
                    colIdx = 4;
                if (colIdx !== -1) {
                    kyRa[colIdx]++;
                    if (lastSeen[colIdx] === -1) {
                        lastSeen[colIdx] = idx; // gap from the latest draw
                    }
                }
            });
            let chuaVe = lastSeen.map(val => val === -1 ? draws.length : val);
            let buoc = kyRa.map(k => k > 0 ? parseFloat((draws.length / k).toFixed(1)) : 0);
            return res.json({
                topNhieu: stats.slice(0, 10),
                topIt: reversed.slice(0, 10),
                topItNhat: reversed.slice(0, 10).map(s => s.number),
                topNhieuNumbers: stats.slice(0, 10).map(s => s.number),
                boSo: stats.slice(0, 12),
                topChuaVe: reversed.slice(0, 10),
                topLienTiep: stats.slice(0, 10),
                dauDuoi: {
                    topDau: stats.slice(0, 10),
                    topDuoi: stats.slice(0, 10),
                },
                chanLe: {
                    columns: ['Chẵn 13+', 'Chẵn 11-12', 'Hoà', 'Lẻ 11-12', 'Lẻ 13+'],
                    kyRa: kyRa,
                    buoc: buoc,
                    chuaVe: chuaVe
                }
            });
        }
        if (type === 'dientoan') {
            if (tab === '235') {
                const so235 = draws.map(d => {
                    const num = d.winningNumbers && d.winningNumbers.length > 0 ? d.winningNumbers[0] : '00000';
                    const dDate = new Date(d.closeTime);
                    return {
                        number: num,
                        date: `${String(dDate.getDate()).padStart(2, '0')}-${String(dDate.getMonth() + 1).padStart(2, '0')}-${dDate.getFullYear()}`
                    };
                });
                return res.json({ so235 });
            }
            if (tab === 'capSo' || tab === 'dt6x36') {
                const counts = {};
                const maxNum = tab === 'dt6x36' ? 36 : 99;
                const padLen = 2;
                for (let i = (tab === 'dt6x36' ? 1 : 0); i <= maxNum; i++) {
                    counts[String(i).padStart(padLen, '0')] = 0;
                }
                draws.forEach(d => {
                    (d.winningNumbers || []).forEach(nStr => {
                        const val = nStr.slice(-2);
                        if (counts[val] !== undefined)
                            counts[val]++;
                    });
                });
                const statsArr = Object.keys(counts).map(k => ({ number: k, count: counts[k] }));
                statsArr.sort((a, b) => b.count - a.count);
                const reversed = [...statsArr].reverse();
                return res.json({
                    khan: reversed.slice(0, 10),
                    nhieu: statsArr.slice(0, 10)
                });
            }
        }
        if (type === 'kienthiet') {
            let prizeIndex = 0; // Default to Đặc Biệt
            if (prize === 'Giải 1')
                prizeIndex = 1;
            else if (prize === 'Giải 2')
                prizeIndex = 2;
            else if (prize === 'Giải 3')
                prizeIndex = 3;
            else if (prize === 'Giải 4')
                prizeIndex = 4;
            else if (prize === 'Giải 5')
                prizeIndex = 5;
            else if (prize === 'Giải 6')
                prizeIndex = 6;
            else if (prize === 'Giải 7')
                prizeIndex = 7;
            else if (prize === 'Giải 8')
                prizeIndex = 8;
            const gridData = draws.map(d => {
                const num = d.winningNumbers && d.winningNumbers.length > prizeIndex ? d.winningNumbers[prizeIndex] : '000000';
                const dDate = new Date(d.closeTime);
                return {
                    number: num,
                    date: `${String(dDate.getDate()).padStart(2, '0')}-${String(dDate.getMonth() + 1).padStart(2, '0')}-${dDate.getFullYear()}`,
                    highlight: num.slice(-2)
                };
            });
            const counts = {};
            for (let i = 0; i <= 99; i++) {
                counts[String(i).padStart(2, '0')] = 0;
            }
            draws.forEach(d => {
                const nStr = d.winningNumbers && d.winningNumbers.length > prizeIndex ? d.winningNumbers[prizeIndex] : '';
                if (nStr) {
                    const val = nStr.slice(-2);
                    if (counts[val] !== undefined)
                        counts[val]++;
                }
            });
            const statsArr = Object.keys(counts).map(k => ({ number: k, count: counts[k] }));
            statsArr.sort((a, b) => b.count - a.count);
            const reversed = [...statsArr].reverse();
            return res.json({
                gridData,
                khan: reversed.slice(0, 10),
                nhieu: statsArr.slice(0, 10)
            });
        }
        res.json({ message: 'No stats logic for this game type yet' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getDrawStats = getDrawStats;
