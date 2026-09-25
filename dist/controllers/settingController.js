"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUpdateSettings = exports.updateSetting = exports.getSetting = void 0;
const Setting_1 = __importDefault(require("../models/Setting"));
const AdminLog_1 = __importDefault(require("../models/AdminLog"));
const getSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const setting = await Setting_1.default.findOne({ key });
        if (!setting) {
            return res.json(null);
        }
        res.json(setting.value);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching setting' });
    }
};
exports.getSetting = getSetting;
const updateSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        const setting = await Setting_1.default.findOneAndUpdate({ key }, { value }, { new: true, upsert: true });
        res.json(setting.value);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating setting' });
    }
};
exports.updateSetting = updateSetting;
function getChanges(oldObj, newObj, path = "") {
    let changes = [];
    if (oldObj === newObj)
        return changes;
    if (typeof oldObj !== 'object' || oldObj === null || typeof newObj !== 'object' || newObj === null) {
        if (oldObj !== newObj) {
            changes.push({ field: path || 'root', old: oldObj, new: newObj });
        }
        return changes;
    }
    const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    for (const key of keys) {
        const currentPath = path ? `${path}.${key}` : key;
        const oldVal = oldObj[key];
        const newVal = newObj[key];
        if (oldVal === newVal)
            continue;
        if (Array.isArray(oldVal) || Array.isArray(newVal)) {
            const oArr = Array.isArray(oldVal) ? oldVal : [];
            const nArr = Array.isArray(newVal) ? newVal : [];
            const maxLen = Math.max(oArr.length, nArr.length);
            for (let i = 0; i < maxLen; i++) {
                changes.push(...getChanges(oArr[i], nArr[i], `${currentPath}[${i}]`));
            }
        }
        else if (typeof oldVal === 'object' && oldVal !== null && typeof newVal === 'object' && newVal !== null) {
            changes.push(...getChanges(oldVal, newVal, currentPath));
        }
        else {
            if (oldVal !== newVal) {
                changes.push({ field: currentPath, old: oldVal, new: newVal });
            }
        }
    }
    return changes;
}
const bulkUpdateSettings = async (req, res) => {
    try {
        const updates = req.body; // e.g., { deposit_config: {...}, binance_config: {...} }
        const keys = Object.keys(updates);
        const oldSettings = await Setting_1.default.find({ key: { $in: keys } });
        const oldSettingsMap = oldSettings.reduce((acc, s) => {
            acc[s.key] = s.value;
            return acc;
        }, {});
        let allChanges = [];
        for (const key of keys) {
            const newValue = updates[key];
            const oldValue = oldSettingsMap[key] || {};
            const changes = getChanges(oldValue, newValue, key);
            allChanges.push(...changes);
            await Setting_1.default.findOneAndUpdate({ key }, { value: newValue }, { new: true, upsert: true });
        }
        if (allChanges.length > 0) {
            const detailsObj = {
                summary: `Đã thay đổi ${allChanges.length} mục trong cấu hình`,
                changes: allChanges
            };
            await AdminLog_1.default.create({
                adminId: req.user?._id,
                adminName: req.user?.name || 'Admin',
                action: 'Cập nhật cấu hình chung',
                details: JSON.stringify(detailsObj)
            });
        }
        res.json({ message: 'Cập nhật thành công' });
    }
    catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật cấu hình' });
    }
};
exports.bulkUpdateSettings = bulkUpdateSettings;
