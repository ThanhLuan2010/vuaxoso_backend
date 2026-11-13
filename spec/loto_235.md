# ĐẶC TẢ GAME: LÔ TÔ 2, 3, 5 SỐ & BAO LÔ TÔ 2 (`loto_235`)

## 1. TỔNG QUAN
- **Mã game**: `loto_235` (hoặc `bao_loto_2`).
- **Nguồn kết quả**: Mở thưởng theo Xổ số Miền Bắc (quay thưởng lúc 18:15 hàng ngày).

---

## 2. CÁC HÌNH THỨC CHƠI & CƠ CẤU GIẢI THƯỞNG

### 2.1. LÔ TÔ 2 SỐ
- Chọn 1 số có **2 chữ số** (`00 - 99`).
- So với **2 số cuối giải Đặc Biệt** hoặc giải Nhất Miền Bắc.
- Mệnh giá cược cơ bản: 10.000đ.
- **Tỉ lệ thưởng**: Trúng 2 số cuối giải ĐB $\rightarrow$ Thưởng **x70 lần** (10.000đ trúng 700.000đ).

### 2.2. LÔ TÔ 3 SỐ
- Chọn 1 số có **3 chữ số** (`000 - 999`).
- So với **3 số cuối giải Đặc Biệt** Miền Bắc.
- **Tỉ lệ thưởng**: Thưởng **x400 lần** (10.000đ trúng 4.000.000đ). Trúng 2 số cuối thưởng x10 lần.

### 2.3. LÔ TÔ 5 SỐ
- Chọn 1 số có **5 chữ số** (`00000 - 99999`).
- So với đầy đủ **5 số giải Đặc Biệt** Miền Bắc.
- **Tỉ lệ thưởng**: Thưởng **x20.000 lần** (10.000đ trúng 200.000.000đ).

### 2.4. BAO LÔ TÔ 2 SỐ
- Chọn 1 số có **2 chữ số** (`00 - 99`).
- So với **2 số cuối của 27 giải** Xổ số Miền Bắc.
- **Chi phí**: Tiền cược $\times 27$ (Ví dụ đánh 1.000đ $\rightarrow$ Chi phí 27.000đ).
- **Tỉ lệ thưởng**: Mỗi nháy về ăn theo tỷ lệ động (khoảng **x99 lần** tiền đánh mỗi con).

---

## 3. MA TRẬN TEST CASES E2E CHO LÔ TÔ 2, 3, 5

### Case 1: Lô tô 2 số tối thiểu (Min Bet)
- **Input**:
  - PlayType: `Lô tô 2 số`
  - Số chọn: `["58"]`, tiền cược: 10.000đ.
- **Kỳ vọng**:
  - Tiền cược: 10.000đ.
  - Kết quả giải ĐB về đuôi `58` $\rightarrow$ Thưởng $10.000 \times 70 = \mathbf{700.000đ}$.

### Case 2: Lô tô 3 số & Lô tô 5 số
- **Input**:
  - Lô tô 3 số: `["789"]`, cược 20.000đ $\rightarrow$ Trúng giải ĐB đuôi `789` nhận $20k \times 400 = \mathbf{8.000.000đ}$.
  - Lô tô 5 số: `["12345"]`, cược 10.000đ $\rightarrow$ Trúng giải ĐB nhận $10k \times 20.000 = \mathbf{200.000.000đ}$.

### Case 3: Bao lô tô 2 số (Multiplier x27)
- **Input**:
  - PlayType: `Bao 2 số`
  - Số: `["68"]`, đơn giá: 2.000đ.
- **Kỳ vọng**:
  - Chi phí = $2.000 \times 27 = \mathbf{54.000đ}$.
  - Về 2 nháy $\rightarrow$ Thưởng $2.000 \times 99 \times 2 = \mathbf{396.000đ}$.
