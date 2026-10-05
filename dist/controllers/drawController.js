"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllDraws = exports.enterResults = exports.createDraw = exports.getDrawResults = exports.getActiveDraws = exports.getKienThietSchedule = void 0;
const AdminLog_1 = __importDefault(require("../models/AdminLog"));
const Draw_1 = __importDefault(require("../models/Draw"));
const Province_1 = __importDefault(require("../models/Province"));
const prizeService_1 = require("../services/prizeService");
const getKienThietSchedule = async (req, res) => {
    try {
        const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const today = new Date();
        const vnTimeStr = today.toLocaleTimeString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false, hour: '2-digit', minute: '2-digit' });
        const [hour, min] = vnTimeStr.split(':').map(Number);
        let baseOffset = 0;
        if (hour > 18 || (hour === 18 && min >= 30)) {
            baseOffset = 1;
            today.setDate(today.getDate() + 1); // shift base day to tomorrow
        }
        const formatDate = (date) => {
            const dayName = daysOfWeek[date.getDay()];
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return `${dayName}, ${day}/${month}`;
        };
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const dayAfter = new Date(today);
        dayAfter.setDate(today.getDate() + 2);
        const mapProvince = (p) => ({
            id: p.provinceId,
            name: p.name,
            code: p.code,
            region: p.region
        });
        const todayDay = today.getDay();
        const tomorrowDay = tomorrow.getDay();
        const dayAfterDay = dayAfter.getDay();
        const [todayProvinces, tomorrowProvinces, dayAfterProvinces] = await Promise.all([
            Province_1.default.find({ drawDays: todayDay }),
            Province_1.default.find({ drawDays: tomorrowDay }),
            Province_1.default.find({ drawDays: dayAfterDay })
        ]);
        const getRegionData = (provs, region) => provs.filter(p => p.region === region).map(mapProvince);
        const schedule = [
            {
                dateString: formatDate(today) + (baseOffset === 0 ? " (Hôm nay)" : " (Ngày mai)"),
                isToday: baseOffset === 0, isTomorrow: baseOffset === 1, isDayAfterTomorrow: baseOffset === 2,
                offset: baseOffset,
                mb: getRegionData(todayProvinces, 'MB'),
                mt: getRegionData(todayProvinces, 'MT'),
                mn: getRegionData(todayProvinces, 'MN')
            },
            {
                dateString: formatDate(tomorrow) + (baseOffset === 0 ? " (Ngày mai)" : " (Ngày kia)"),
                isToday: false, isTomorrow: baseOffset === 0, isDayAfterTomorrow: baseOffset === 1,
                offset: baseOffset + 1,
                mb: getRegionData(tomorrowProvinces, 'MB'),
                mt: getRegionData(tomorrowProvinces, 'MT'),
                mn: getRegionData(tomorrowProvinces, 'MN')
            },
            {
                dateString: formatDate(dayAfter) + (baseOffset === 0 ? " (Ngày kia)" : ""),
                isToday: false, isTomorrow: false, isDayAfterTomorrow: baseOffset === 0,
                offset: baseOffset + 2,
                mb: getRegionData(dayAfterProvinces, 'MB'),
                mt: getRegionData(dayAfterProvinces, 'MT'),
                mn: getRegionData(dayAfterProvinces, 'MN')
            }
        ];
        res.json(schedule);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getKienThietSchedule = getKienThietSchedule;
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
// Public: Lấy danh sách các kỳ quay đang mở
const getActiveDraws = async (req, res) => {
    try {
        const Game = require('../models/Game').default;
        const games = await Game.find({ isActive: true });
        const now = new Date();
        // Auto-close any expired non-Keno open draws
        await Draw_1.default.updateMany({ status: 'open', closeTime: { $lte: now } }, { $set: { status: 'closed' } });
        for (const game of games) {
            if (game.code === 'keno' || game.code === 'bao_keno' || game.code === 'clln_keno' || game.code === 'bingo18') {
                if (game.code === 'bingo18') {
                    await Draw_1.default.deleteMany({
                        game: game._id,
                        status: 'open',
                        drawCode: { $regex: /^#10/ }
                    });
                }
                const expiredDraws = await Draw_1.default.find({
                    game: game._id,
                    status: 'open',
                    closeTime: { $lte: now }
                });
                for (const d of expiredDraws) {
                    if (game.autoRandomResult) {
                        const winningNumbers = [];
                        const nums = new Set();
                        while (nums.size < (game.code === 'bingo18' ? 3 : 20)) {
                            const rnd = Math.floor(Math.random() * (game.code === 'bingo18' ? 6 : 80)) + 1;
                            nums.add(rnd.toString().padStart(2, '0'));
                        }
                        d.winningNumbers = Array.from(nums);
                        d.status = 'completed';
                    }
                    else {
                        d.status = 'closed';
                    }
                    await d.save();
                    if (game.autoRandomResult) {
                        try {
                            (0, prizeService_1.processDrawResults)(d._id.toString());
                        }
                        catch (err) { }
                    }
                }
                const durationMinutes = game.code === 'bingo18' ? 6 : (game.drawDurationMinutes || 8);
                const openDraws = await Draw_1.default.find({
                    game: game._id,
                    status: 'open',
                    closeTime: { $gt: now }
                }).sort({ closeTime: 1 });
                if (openDraws.length < 10) {
                    let lastCloseTime = now;
                    let lastDrawNum = 1;
                    if (openDraws.length > 0) {
                        const last = openDraws[openDraws.length - 1];
                        lastCloseTime = new Date(last.closeTime);
                        const match = last.drawCode.match(/#?(\d+)/);
                        if (match)
                            lastDrawNum = parseInt(match[1]);
                    }
                    else {
                        const lastCompleted = await Draw_1.default.findOne({ game: game._id }).sort({ closeTime: -1 });
                        if (lastCompleted) {
                            lastCloseTime = new Date(Math.max(now.getTime(), new Date(lastCompleted.closeTime).getTime()));
                            const match = lastCompleted.drawCode.match(/#?(\d+)/);
                            if (match)
                                lastDrawNum = parseInt(match[1]);
                        }
                    }
                    const needed = 10 - openDraws.length;
                    for (let i = 0; i < needed; i++) {
                        const openTime = new Date(lastCloseTime.getTime());
                        const closeTime = new Date(openTime.getTime() + durationMinutes * 60 * 1000);
                        lastDrawNum += 1;
                        const drawCode = `#${String(lastDrawNum).padStart(5, '0')}`;
                        await Draw_1.default.create({
                            game: game._id,
                            drawCode,
                            openTime,
                            closeTime,
                            status: 'open'
                        });
                        lastCloseTime = closeTime;
                    }
                }
            }
            else if (game.code === 'power_655' ||
                game.code === 'mega_645' ||
                game.code === 'max_3d' ||
                game.code === 'max_3d_pro' ||
                game.code === 'max_4d' ||
                game.code === 'dientoan_636' ||
                game.code === 'bao_636' ||
                (game.type === 'dientoan' && game.code !== 'bingo18') ||
                game.type === 'vietlott') {
                const openDraws = await Draw_1.default.find({
                    game: game._id,
                    status: 'open',
                    closeTime: { $gt: now }
                }).sort({ closeTime: 1 });
                if (openDraws.length < 10) {
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
                            const cutoff = getVNCutoffDate(checkDate, 17, 20);
                            if (cutoff > now) {
                                lastDrawNum += 1;
                                const drawCode = `#${lastDrawNum}`;
                                await Draw_1.default.create({
                                    game: game._id,
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
        }
        const draws = await Draw_1.default.find({ status: 'open', closeTime: { $gt: now } }).populate('game').sort({ closeTime: 1 });
        res.json(draws);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getActiveDraws = getActiveDraws;
// Public: Lấy kết quả (kỳ quay đã hoàn thành)
const getDrawResults = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type;
        const code = req.query.code;
        let drawQuery = { status: 'completed' };
        // Nếu có truyền type hoặc code thì query Game để lọc trước
        if (type || code) {
            let gameQuery = {};
            if (type)
                gameQuery.type = type;
            if (code) {
                if (type === 'kienthiet') {
                    // Đối với xổ số kiến thiết, filter theo mã vùng (vd: mien_bac -> MB)
                    let dbCode = code;
                    if (code === 'mien_bac')
                        dbCode = 'MB';
                    else if (code === 'mien_trung')
                        dbCode = 'MT';
                    else if (code === 'mien_nam')
                        dbCode = 'MN';
                    gameQuery.code = dbCode;
                }
                else {
                    gameQuery.code = code;
                }
            }
            // Lấy model Game. (Sử dụng require or mongoose.model do không import sẵn, nhưng import thì tốt hơn)
            // Chờ đã, file này không import model Game. Hãy import. 
            // Nhưng require cho an toàn.
            const Game = require('../models/Game').default;
            const matchingGames = await Game.find(gameQuery);
            const gameIds = matchingGames.map((g) => g._id);
            drawQuery.game = { $in: gameIds };
        }
        const skip = (page - 1) * limit;
        const draws = await Draw_1.default.find(drawQuery)
            .populate('game')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        // Attach province details if available
        const Province = require('../models/Province').default;
        const provinces = await Province.find().lean();
        const provinceMap = new Map();
        provinces.forEach((p) => provinceMap.set(p.provinceId, p));
        const enrichedDraws = draws.map((d) => {
            if (d.provinceId && provinceMap.has(d.provinceId)) {
                d.province = provinceMap.get(d.provinceId);
            }
            return d;
        });
        res.json(enrichedDraws);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getDrawResults = getDrawResults;
// Admin: Tạo kỳ quay mới
const createDraw = async (req, res) => {
    try {
        const { gameId, drawCode, openTime, closeTime, jackpotAmount, provinceId } = req.body;
        const draw = await Draw_1.default.create({
            game: gameId,
            drawCode,
            openTime,
            closeTime,
            jackpotAmount,
            provinceId
        });
        await AdminLog_1.default.create({ adminId: req.user?._id, adminName: req.user?.name || 'Admin', action: 'Tạo Kỳ Quay', details: `Tạo kỳ quay: ${draw.drawCode}` });
        res.status(201).json(draw);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createDraw = createDraw;
// Admin: Cập nhật kết quả trúng thưởng
const enterResults = async (req, res) => {
    try {
        const { winningNumbers, provinceId } = req.body;
        const draw = await Draw_1.default.findById(req.params.id).populate('game');
        if (!draw) {
            return res.status(404).json({ message: 'Không tìm thấy kỳ quay' });
        }
        draw.winningNumbers = winningNumbers;
        if (provinceId)
            draw.provinceId = provinceId;
        draw.status = 'completed';
        await draw.save();
        // Chạy logic dò vé để trả thưởng cho User (Phase 3)
        await (0, prizeService_1.processDrawResults)(draw._id.toString());
        // Auto-create next draw if no active draw exists (Only for Keno / fast-interval games)
        const game = draw.game;
        if (game && (game.code.includes('keno') || game.code === 'bingo18')) {
            const activeDraws = await Draw_1.default.countDocuments({ game: game._id, status: 'open' });
            if (activeDraws === 0) {
                const durationMinutes = game.drawDurationMinutes || 8;
                const openTime = new Date();
                const closeTime = new Date(openTime.getTime() + durationMinutes * 60000);
                let nextDrawCode = '';
                const match = draw.drawCode.match(/#?(\d+)/);
                if (match) {
                    const nextNum = parseInt(match[1]) + 1;
                    nextDrawCode = `#${nextNum}`;
                }
                else {
                    nextDrawCode = `#${Date.now()}`;
                }
                const existing = await Draw_1.default.findOne({ game: game._id, drawCode: nextDrawCode });
                if (!existing) {
                    await Draw_1.default.create({
                        game: game._id,
                        drawCode: nextDrawCode,
                        openTime,
                        closeTime,
                        status: 'open'
                    });
                }
            }
        }
        res.json(draw);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.enterResults = enterResults;
// Admin: Lấy tất cả kỳ quay để quản lý
const getAllDraws = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const gameId = req.query.gameId;
        let query = {};
        if (gameId) {
            query.game = gameId;
        }
        const skip = (page - 1) * limit;
        const [draws, total] = await Promise.all([
            Draw_1.default.find(query).populate('game').sort({ createdAt: -1 }).skip(skip).limit(limit),
            Draw_1.default.countDocuments(query)
        ]);
        res.json({ data: draws, total, page, limit });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllDraws = getAllDraws;
