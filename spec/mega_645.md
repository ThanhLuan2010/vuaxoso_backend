# ĐẶC TẢ GAME: MEGA 6/45 (`mega_645`)

## 1. TỔNG QUAN
- **Mã game**: `mega_645`
- **Loại game**: Vietlott Ma trận Jackpot.
- **Lịch quay**: Thứ Tư, Thứ Sáu, Chủ Nhật hàng tuần lúc 18:00.
- **Quy luật quay thưởng**:
  - Quay chọn ngẫu nhiên **6 số** từ **01 đến 45** (không trùng lặp). Không có số đặc biệt (không có bonus ball).

---

## 2. CÁC HÌNH THỨC CHƠI & CÔNG THỨC TÍNH TIỀN

### 2.1. CƠ BẢN (ĐƠN)
- Chọn đúng **6 số** khác nhau trong khoảng `[01 .. 45]`.
- Cho phép tối đa 6 bảng (`A, B, C, D, E, F`).
- Mức giá cơ sở: 10.000đ / bảng / kỳ.
- Bội số cược: 10k, 20k, 50k, 100k, 200k, 500k.

### 2.2. CHƠI BAO
- **Bao 5**: Chọn 5 số từ 01-45. Hệ thống ghép với 40 số còn lại để tạo thành **40 bộ 6 số**.
  - Tiền cược Bao 5 = $40 \times 10.000đ = \mathbf{400.000đ}$ / kỳ.
- **Bao 7 đến Bao 15, Bao 18**: Chọn $N$ số ($N \in \{7, 8, 9, 10, 11, 12, 13, 14, 15, 18\}$).
  - Số bộ 6 số = $C(N, 6) = \frac{N!}{6!(N - 6)!}$.
  - Tiền cược = $C(N, 6) \times 10.000đ \times D$ (số kỳ).

| Loại Bao | Số lượng số chọn ($N$) | Số tổ hợp 6 số ($C(N, 6)$) | Giá cược 1 kỳ (VNĐ) |
| :---: | :---: | :---: | :--- |
| **Bao 5** | 5 số | 40 bộ | 400.000 |
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

So khớp 6 số của vé với 6 số trúng thưởng của kỳ quay:

| Giải Thưởng | Điều Kiện Trúng | Giá Trị Thưởng Cơ Sở (VNĐ) |
| :--- | :--- | :--- |
| **Jackpot** | Trùng đúng **6 số** | Tối thiểu 12 Tỷ VNĐ (Cố định trong mock/MVP: 800.000.000đ) |
| **Giải Nhất** | Trùng đúng **5 số** | **10.000.000đ** |
| **Giải Nhì** | Trùng đúng **4 số** | **300.000đ** |
| **Giải Ba** | Trùng đúng **3 số** | **30.000đ** |

*Nếu vé cược bội số (multiplier > 10.000đ), tiền thưởng nhân theo tỷ lệ tương ứng.*

---

## 4. MA TRẬN TEST CASES E2E CHO MEGA 6/45

### Case 1: Đặt ít nhất (Min Bet)
- **Input**:
  - PlayType: `Cơ bản`
  - Bảng A: `["01", "10", "15", "24", "33", "42"]`
  - Multiplier: 10.000đ, 1 kỳ quay.
- **Kỳ vọng**:
  - Tiền cược: 10.000đ.
  - Backend trừ đúng 10.000đ.
  - Trúng thưởng:
    - Trùng 3 số $\rightarrow$ 30.000đ.
    - Trùng 4 số $\rightarrow$ 300.000đ.
    - Trùng 5 số $\rightarrow$ 10.000.000đ.
    - Trùng 6 số $\rightarrow$ Jackpot.

### Case 2: Đặt nhiều bảng & tăng bội số
- **Input**:
  - 4 bảng A, B, C, D (mỗi bảng 6 số hợp lệ).
  - Multiplier: 50.000đ / bảng (gấp 5 lần vé thường).
  - Chọn 2 kỳ quay liên tiếp.
- **Kỳ vọng**:
  - Tiền cược 1 kỳ = $4 \times 50.000 = 200.000đ$.
  - Tổng tiền cược 2 kỳ = $200.000 \times 2 = \mathbf{400.000đ}$.
  - Giả sử bảng A trúng Giải Ba (3 số trùng) $\rightarrow$ Thưởng nhận = $30.000 \times 5 = \mathbf{150.000đ}$.

### Case 3: Chơi Bao 5 & Bao 7
- **Bao 5**: Chọn 5 số `["05", "11", "20", "28", "40"]`.
  - Giá: 400.000đ / kỳ.
- **Bao 7**: Chọn 7 số `["02", "07", "16", "23", "31", "39", "45"]`.
  - Giá: 70.000đ / kỳ.

### Case 4: Chơi Bao lớn (Bao 9, 10 - Heavy)
- **Bao 9**: 84 bộ số $\times$ 10k = 840.000đ.
- **Bao 10**: 210 bộ số $\times$ 10k = 2.100.000đ.

### Case 5: Biên & Ngoại lệ
- Chọn số lớn hơn 45 (e.g. `46`) $\rightarrow$ Không được phép.
- Trùng số $\rightarrow$ Chặn.
- Thiếu số $\rightarrow$ Không cho gửi đơn.
- Tài khoản thiếu tiền $\rightarrow$ Báo lỗi.
