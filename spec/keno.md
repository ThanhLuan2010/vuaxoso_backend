# ĐẶC TẢ GAME: KENO (`keno`, `bao_keno`, `clln_keno`)

## 1. TỔNG QUAN
- **Mã game**: `keno` (Cơ bản), `bao_keno` (Bao Keno), `clln_keno` (Chẵn Lẻ Lớn Nhỏ).
- **Loại game**: Vietlott mở thưởng nhanh (8 phút / kỳ).
- **Quy luật quay thưởng**: Mỗi kỳ quay chọn ngẫu nhiên **20 số** trong tập hợp từ **01 đến 80** (không trùng lặp).
- **Thời gian chốt vé**: Ngay trước thời điểm bắt đầu quay thưởng (closeTime).

---

## 2. CÁC HÌNH THỨC CHƠI & CÔNG THỨC TÍNH TIỀN

### 2.1. KENO CƠ BẢN (`basic`)
- **Cách chơi**: Người chơi chọn Bậc từ **Bậc 1** đến **Bậc 10**.
  - Bậc $K$: Chọn đúng $K$ số nguyên khác nhau trong khoảng `[01 .. 80]`.
- **Số bảng cho phép**: Từ 1 đến 6 bảng (`A`, `B`, `C`, `D`, `E`, `F`).
- **Bội số cược (Multiplier)**: 10.000đ (mặc định), 20.000đ, 50.000đ
- **Kỳ quay**: Cho phép chọn từ 1 đến nhiều kỳ liên tiếp ($D$ kỳ).
- **Công thức tính tiền**:
  $$\text{Tiền bảng } i = \text{multiplier}_i \times D$$
  $$\text{Tổng tiền đơn} = \sum_{i=1}^{M} (\text{multiplier}_i \times D) \quad (M \le 6)$$
  - **Mức cược ít nhất (Min)**: 1 bảng Bậc 1, cược 10.000đ, 1 kỳ $\rightarrow$ **10.000đ**.
  - **Mức cược nhiều nhất (Max)**: 6 bảng Bậc 10, cược 500.000đ/bảng, 10 kỳ $\rightarrow$ $6 \times 500.000 \times 10 = \mathbf{30.000.000đ}$.

### 2.2. BAO KENO (`bao`)
- **Cách chơi**: Chọn $N$ số ($3 \le N \le 15$), sau đó chọn Bậc $K$ với $K < N$.
- Hệ thống tự động sinh tất cả các tổ hợp chập $K$ của $N$ số:
  $$C(N, K) = \frac{N!}{K!(N - K)!}$$
- **Công thức tính tiền**:
  $$\text{Tổng tiền} = C(N, K) \times 10.000đ \times D \text{ (số kỳ)}$$
- **Ví dụ từ ít đến nhiều**:
  - *Bao ít (Min)*: Bao 3 - Bậc 2: $C(3, 2) = 3$ bộ số $\rightarrow 3 \times 10.000 = \mathbf{30.000đ}$.
  - *Bao vừa*: Bao 7 - Bậc 5: $C(7, 5) = 21$ bộ số $\rightarrow 21 \times 10.000 = \mathbf{210.000đ}$.
  - *Bao nhiều (Max)*: Bao 12 - Bậc 6: $C(12, 6) = 924$ bộ số $\times 10.000đ \times 5 \text{ kỳ} = \mathbf{46.200.000đ}$.

### 2.3. CHẴN - LẺ - LỚN - NHỎ (`cl_ln`)
Gồm 4 bảng A, B (Lớn/Nhỏ), C, D (Chẵn/Lẻ) với các cửa đặt:
1. **Lớn**: Có từ 13 số trở lên nằm trong khoảng `41 - 80`. (Tỉ lệ ăn: 1:1.9)
2. **Nhỏ**: Có từ 13 số trở lên nằm trong khoảng `01 - 40`. (Tỉ lệ ăn: 1:1.9)
3. **Hòa Lớn Nhỏ**: Có đúng 10 số thuộc `01-40` và 10 số thuộc `41-80`. (Tỉ lệ ăn: 1:5.8)
4. **Chẵn**: Có từ 13 số chẵn trở lên. (Tỉ lệ ăn: 1:2.0)
5. **Lẻ**: Có từ 13 số lẻ trở lên. (Tỉ lệ ăn: 1:2.0)
6. **Hòa Chẵn Lẻ**: Có đúng 10 số chẵn và 10 số lẻ. (Tỉ lệ ăn: 1:5.8)
7. **Chẵn 11-12**: Có đúng 11 hoặc 12 số chẵn. (Tỉ lệ ăn: 1:3.0)
8. **Lẻ 11-12**: Có đúng 11 hoặc 12 số lẻ. (Tỉ lệ ăn: 1:3.0)
- **Công thức tính tiền**: Số cửa chọn $\times 10.000đ \times D$ (số kỳ).

---

## 3. CƠ CẤU GIẢI THƯỞNG KENO CƠ BẢN (MỖI 10.000đ)

| Bậc | Số Trùng | Tiền Thưởng (đ) | Ghi chú |
| :---: | :---: | :--- | :--- |
| **Bậc 1** | 1 | 20.000 | x2 |
| **Bậc 2** | 2 | 90.000 | x9 |
| **Bậc 3** | 3 / 2 | 200.000 / 20.000 | |
| **Bậc 4** | 4 / 3 / 2 | 400.000 / 50.000 / 10.000 | |
| **Bậc 5** | 5 / 4 / 3 | 4.400.000 / 150.000 / 10.000 | |
| **Bậc 6** | 6 / 5 / 4 / 3 | 12.500.000 / 450.000 / 40.000 / 10.000 | |
| **Bậc 7** | 7 / 6 / 5 / 4 | 40.000.000 / 1.200.000 / 100.000 / 20.000 | |
| **Bậc 8** | 8 / 7 / 6 / 5 / 0 | 200.000.000 / 5.000.000 / 500.000 / 50.000 / 10.000 | Trùng 0 số vẫn trúng 10k |
| **Bậc 9** | 9 / 8 / 7 / 6 / 5 / 0 | 800.000.000 / 12.000.000 / 1.500.000 / 150.000 / 10.000 / 10.000 | |
| **Bậc 10** | 10 / 9 / 8 / 7 / 6 / 5 / 0 | 2.000.000.000 / 150.000.000 / 7.400.000 / 600.000 / 80.000 / 20.000 / 10.000 | Jackpot 2 Tỷ |

*Nếu cược Bội số $M$ (ví dụ 50k = gấp 5 lần 10k), Tiền thưởng = $\text{Tiền Thưởng Bậc} \times (M / 10.000)$.*

---

## 4. MA TRẬN TEST CASES E2E CHO KENO

### Case 1: Đặt ít nhất (Min Bet)
- **Input**:
  - Tab: `basic`
  - Bậc: 1
  - Bảng A: `["08"]` (1 số duy nhất)
  - Multiplier: 10.000đ
  - Số kỳ: 1 kỳ
- **Kỳ vọng**:
  - Mobile: Tổng tiền hiển thị 10.000đ.
  - Checkout Payload: `orders[0].items[0].cost = 10000`, `items.length = 1`.
  - Backend: Trừ đúng 10.000đ vào ví user.
  - Kết quả: Nếu kỳ quay có số `08` $\rightarrow$ Trúng 20.000đ. Nếu không có $\rightarrow$ Thua (0đ).

### Case 2: Đặt nhiều bảng & tăng bội số (Multi-boards & Multiplier)
- **Input**:
  - Tab: `basic`
  - Bậc: 2
  - Bảng A: `["05", "18"]` (multiplier 20.000đ)
  - Bảng B: `["11", "22"]` (multiplier 50.000đ)
  - Bảng C: `["33", "44"]` (multiplier 10.000đ)
  - Số kỳ: 2 kỳ
- **Kỳ vọng**:
  - Chi phí 1 kỳ: $(20k + 50k + 10k) = 80.000đ$.
  - Tổng tiền 2 kỳ: $80.000 \times 2 = 160.000đ$.
  - Backend kiểm tra user đủ balance $\ge 160.000đ$ và trừ chính xác.

### Case 3: Bao Keno nhỏ và lớn (Bao combinations)
- **Subcase 3A (Bao nhỏ)**:
  - Tab: `bao`, Bao 3, Bậc 2: Chọn 3 số `["01", "02", "03"]`.
  - Tổ hợp $C(3, 2) = 3$. Tổng tiền 1 kỳ = $3 \times 10.000 = 30.000đ$.
- **Subcase 3B (Bao lớn - Heavy)**:
  - Tab: `bao`, Bao 8, Bậc 4: Chọn 8 số `["05", "12", "19", "25", "38", "50", "66", "79"]`.
  - Tổ hợp $C(8, 4) = 70$ bộ số.
  - Chọn 3 kỳ quay liên tiếp.
  - Tổng tiền = $70 \times 10.000đ \times 3 = \mathbf{2.100.000đ}$.
  - Backend dò thưởng: Kiểm tra tất cả 70 tổ hợp xem mỗi tổ hợp trúng bao nhiêu con và cộng dồn toàn bộ giải.

### Case 4: Chẵn - Lẻ - Lớn - Nhỏ (`cl_ln`)
- **Input**:
  - Bảng A: Chọn `Lớn` (10.000đ)
  - Bảng C: Chọn `Chẵn` (10.000đ)
  - 1 kỳ quay.
- **Kỳ vọng**:
  - Tổng cược: 20.000đ.
  - Kết quả quay ra: 14 số chẵn, 15 số > 40 $\rightarrow$ Thắng cả 2 cửa.
  - Thưởng: Lớn trúng $10k \times 1.9 = 19.000đ$, Chẵn trúng $10k \times 2.0 = 20.000đ$. Tổng nhận = 39.000đ.

### Case 5: Biên & Ngoại lệ (Edge cases)
- Chọn trùng số trong 1 bảng $\rightarrow$ Hệ thống chặn không cho trùng.
- Bậc 5 nhưng mới chọn 4 số $\rightarrow$ Báo lỗi "Vui lòng chọn đủ 5 số".
- Số dư ví < Tổng tiền cược $\rightarrow$ Backend trả về lỗi 400 "Số dư không đủ! Vui lòng nạp thêm tiền".
- Kỳ quay đã hết hạn (`closeTime` < `Date.now()`) $\rightarrow$ Backend từ chối cược cho kỳ đã đóng.
