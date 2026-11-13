# ĐẶC TẢ GAME: POWER 6/55 (`power_655`)

## 1. TỔNG QUAN
- **Mã game**: `power_655`
- **Loại game**: Vietlott Ma trận Jackpot lớn.
- **Lịch quay**: Thứ Ba, Thứ Năm, Thứ Bảy hàng tuần lúc 18:00.
- **Quy luật quay thưởng**:
  - Quay chọn **6 số chính** ngẫu nhiên từ **01 đến 55** (không trùng lặp).
  - Sau đó quay chọn thêm **1 số đặc biệt** (số thứ 7 - Bonus number) từ 49 số còn lại.

---

## 2. CÁC HÌNH THỨC CHƠI & CÔNG THỨC TÍNH TIỀN

### 2.1. CƠ BẢN (ĐƠN)
- Chọn đúng **6 số** khác nhau trong tập hợp từ `01` đến `55`.
- Cho phép tối đa 6 bảng (`A, B, C, D, E, F`).
- Mức giá cơ sở: 10.000đ / bảng / kỳ.
- Bội số cược: 10k, 20k, 50k, 100k, 200k, 500k.
- Số kỳ quay: 1 kỳ hoặc nhiều kỳ liên tiếp.

### 2.2. CHƠI BAO
- **Bao 5**: Người chơi chọn 5 số từ 01-55. Hệ thống ghép 5 số này với lần lượt 50 số còn lại để tạo thành **50 bộ 6 số**.
  - Tiền cược Bao 5 = $50 \times 10.000đ = \mathbf{500.000đ}$ / kỳ.
- **Bao 7 đến Bao 15, Bao 18**: Người chơi chọn $N$ số ($N \in \{7, 8, 9, 10, 11, 12, 13, 14, 15, 18\}$).
  - Số bộ 6 số được tạo thành = $C(N, 6) = \frac{N!}{6!(N - 6)!}$.
  - Tiền cược = $C(N, 6) \times 10.000đ \times D$ (số kỳ).

| Loại Bao | Số lượng số chọn ($N$) | Số tổ hợp 6 số ($C(N, 6)$) | Giá cược 1 kỳ (VNĐ) |
| :---: | :---: | :---: | :--- |
| **Bao 5** | 5 số | 50 bộ | 500.000 |
| **Bao 7** | 7 số | 7 bộ | 70.000 |
| **Bao 8** | 8 số | 28 bộ | 280.000 |
| **Bao 9** | 9 số | 84 bộ | 840.000 |
| **Bao 10** | 10 số | 210 bộ | 2.100.000 |
| **Bao 11** | 11 số | 462 bộ | 4.620.000 |
| **Bao 12** | 12 số | 924 bộ | 9.240.000 |
| **Bao 13** | 13 số | 1.716 bộ | 17.160.000 |
| **Bao 14** | 14 số | 3.003 bộ | 30.030.000 |
| **Bao 15** | 15 số | 5.005 bộ | 50.050.000 |
| **Bao 18** | 18 số | 18.564 bộ | **185.640.000** |

---

## 3. CƠ CẤU GIẢI THƯỞNG VÀ ĐIỀU KIỆN TRÚNG

So khớp 6 số của vé với 6 số chính và 1 số đặc biệt của kỳ quay:

| Giải Thưởng | Điều Kiện Trúng | Giá Trị Thưởng Cơ Sở (VNĐ) |
| :--- | :--- | :--- |
| **Jackpot 1** | Trùng đúng **6 số chính** | Tối thiểu 30 Tỷ VNĐ (Cố định trong mock/MVP: 2.000.000.000đ) |
| **Jackpot 2** | Trùng **5 số chính + 1 số đặc biệt** | Tối thiểu 3 Tỷ VNĐ (Cố định trong mock/MVP: 1.500.000.000đ) |
| **Giải Nhất** | Trùng đúng **5 số chính** (không trùng số đặc biệt) | **40.000.000đ** |
| **Giải Nhì** | Trùng đúng **4 số chính** | **500.000đ** |
| **Giải Ba** | Trùng đúng **3 số chính** | **50.000đ** |

*Nếu vé cược nhiều lần mức 10k (multiplier), tiền thưởng nhân theo tỉ lệ tương ứng.*

---

## 4. MA TRẬN TEST CASES E2E CHO POWER 6/55

### Case 1: Đặt ít nhất (Min Bet)
- **Input**:
  - PlayType: `Cơ bản`
  - Bảng A: `["03", "12", "25", "37", "44", "51"]` (đúng 6 số trong 01-55)
  - Multiplier: 10.000đ, 1 kỳ quay.
- **Kỳ vọng**:
  - Tổng tiền: 10.000đ.
  - Backend tạo đơn thành công, trừ 10.000đ tài khoản.
  - Dò giải:
    - Nếu trùng 3 số $\rightarrow$ Thưởng 50.000đ.
    - Nếu trùng 4 số $\rightarrow$ Thưởng 500.000đ.
    - Nếu trùng 5 số $\rightarrow$ Thưởng 40.000.000đ.
    - Nếu trùng 5 số + số đặc biệt $\rightarrow$ Jackpot 2.
    - Nếu trùng 6 số chính $\rightarrow$ Jackpot 1.

### Case 2: Đặt tối đa 6 bảng (Full A-F) & Nhiều kỳ
- **Input**:
  - PlayType: `Cơ bản`
  - 6 bảng A, B, C, D, E, F mỗi bảng chọn đủ 6 số hợp lệ.
  - Multiplier: 20.000đ cho mỗi bảng.
  - Chọn 3 kỳ quay liên tiếp.
- **Kỳ vọng**:
  - Chi phí 1 bảng = $20.000 \times 3 = 60.000đ$.
  - Tổng tiền đơn = $6 \times 60.000 = \mathbf{360.000đ}$.
  - User bị trừ đúng 360.000đ.

### Case 3: Chơi Bao nhỏ (Bao 7)
- **Input**:
  - PlayType: `Bao 7`
  - Chọn 7 số: `["01", "09", "15", "22", "30", "41", "55"]`.
  - 1 kỳ quay.
- **Kỳ vọng**:
  - 7 tổ hợp con. Tổng tiền = 70.000đ.
  - Giả sử trúng 4 số trong 7 số $\rightarrow$ Theo bảng thưởng Bao 7, trúng 3 giải Nhì ($3 \times 500k$) + 4 giải Ba ($4 \times 50k$) = 1.700.000đ.

### Case 4: Chơi Bao lớn (Bao 10 hoặc Bao 12 - Heavy)
- **Input**:
  - PlayType: `Bao 10`
  - Chọn 10 số: `["02", "08", "14", "23", "29", "35", "42", "48", "50", "54"]`.
  - 2 kỳ quay.
- **Kỳ vọng**:
  - Số bộ: 210 bộ.
  - Chi phí = $210 \times 10.000 \times 2 = \mathbf{4.200.000đ}$.
  - Payload gửi lên chính xác, backend lưu và dò đúng từng kỳ.

### Case 5: Biên & Validation
- Chọn số ngoài khoảng (ví dụ `00` hoặc `56`) $\rightarrow$ Chặn.
- Chọn trùng lặp số (ví dụ 2 lần số `15`) $\rightarrow$ Chặn.
- Chưa đủ 6 số nhưng bấm thanh toán $\rightarrow$ Chặn kèm Toast cảnh báo.
- Số dư ví < 10.000đ $\rightarrow$ Báo lỗi số dư không đủ.
