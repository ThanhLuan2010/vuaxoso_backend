# ĐẶC TẢ GAME: LÔ TÔ 2, 3, 4 CẶP SỐ (`loto_cap`)

## 1. TỔNG QUAN
- **Mã game**: `loto_cap`
- **Nguồn kết quả**: So khớp với 2 số cuối của **27 giải Xổ số Miền Bắc**.

---

## 2. CÁC HÌNH THỨC CHƠI & TỈ LỆ THƯỞNG

Người chơi chọn các cặp số (mỗi cặp là 1 số có 2 chữ số từ `00` đến `99`):
1. **Lô tô 2 cặp số**: Chọn 2 cặp số khác nhau (ví dụ: `12` và `34`).
   - Cả 2 cặp số phải cùng xuất hiện trong 2 số cuối của 27 giải.
   - **Tỉ lệ thưởng**: Thưởng **x15 lần** tiền cược (hoặc theo cấu hình game x110 lần).
2. **Lô tô 3 cặp số**: Chọn 3 cặp số khác nhau (ví dụ: `12`, `34`, `56`).
   - Cả 3 cặp số cùng về trong 27 giải.
   - **Tỉ lệ thưởng**: Thưởng **x60 lần** tiền cược.
3. **Lô tô 4 cặp số**: Chọn 4 cặp số khác nhau (ví dụ: `12`, `34`, `56`, `78`).
   - Cả 4 cặp số cùng về trong 27 giải.
   - **Tỉ lệ thưởng**: Thưởng **x1.000 lần** tiền cược.

---

## 3. MA TRẬN TEST CASES E2E CHO LÔ TÔ CẶP

### Case 1: Lô tô 2 cặp tối thiểu (Min Bet)
- **Input**:
  - PlayType: `Lô tô 2 cặp`
  - Cặp số: `["18", "81"]`
  - Tiền cược: 10.000đ, 1 kỳ quay.
- **Kỳ vọng**:
  - Tiền cược: 10.000đ.
  - Kết quả 27 giải có cả số `18` và `81` $\rightarrow$ Trúng thưởng.

### Case 2: Lô tô 3 cặp & 4 cặp
- **Lô tô 3 cặp**: Chọn `["11", "22", "33"]`, cược 20.000đ.
  - 27 giải xuất hiện cả 3 cặp $\rightarrow$ Trúng thưởng $20.000 \times 60 = 1.200.000đ$.
  - 1 cặp không về $\rightarrow$ Thua 0đ.
