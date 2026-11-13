# ĐẶC TẢ GAME: MAX 4D (`max_4d`)

## 1. TỔNG QUAN
- **Mã game**: `max_4d`
- **Loại game**: Vietlott Số 4 chữ số.
- **Lịch quay**: Thứ Ba, Thứ Năm, Thứ Bảy hàng tuần lúc 18:00.
- **Quy luật quay thưởng**: Mỗi kỳ quay mở thưởng **6 giải** gồm các bộ 4 chữ số (từ `0000` đến `9999`):
  - 1 bộ giải Nhất (ví dụ: `7890`)
  - 2 bộ giải Nhì (ví dụ: `1234`, `5678`)
  - 3 bộ giải Ba (ví dụ: `4321`, `8765`, `9012`)

---

## 2. CÁC HÌNH THỨC CHƠI & CƠ CẤU GIẢI THƯỞNG

### 2.1. CƠ BẢN (1 BỘ 4 CHỮ SỐ)
- Người chơi chọn **1 bộ 4 chữ số**, ví dụ `7890`.
- Bảng A đến F (tối đa 6 bảng).
- Giá cược: 10.000đ / bảng / kỳ. Có thể nhân bội số cược.
- **Cơ cấu giải thưởng** (so với bộ số của giải):
  - **Giải Nhất**: Trùng bộ số giải Nhất $\rightarrow$ **15.000.000đ**
  - **Giải Nhì**: Trùng 1 trong 2 bộ số giải Nhì $\rightarrow$ **6.500.000đ**
  - **Giải Ba**: Trùng 1 trong 3 bộ số giải Ba $\rightarrow$ **3.000.000đ**
  - **Giải Khuyến Khích 1**: Trùng **3 chữ số cuối** của giải Nhất (ví dụ giải Nhất `7890`, vé `x890`) $\rightarrow$ **1.000.000đ**
  - **Giải Khuyến Khích 2**: Trùng **2 chữ số cuối** của giải Nhất (ví dụ giải Nhất `7890`, vé `xx90`) $\rightarrow$ **100.000đ**

### 2.2. CHƠI BAO (HOÁN VỊ)
- Cho phép người chơi hoán vị các vị trí của 4 chữ số:
  - Bao 4: 4 hoán vị (khi có 3 chữ số giống nhau, ví dụ `1112`). Giá: $4 \times 10k = 40.000đ$.
  - Bao 6: 6 hoán vị (khi có 2 cặp chữ số giống nhau, ví dụ `1122`). Giá: $6 \times 10k = 60.000đ$.
  - Bao 12: 12 hoán vị (khi có 2 chữ số giống nhau, ví dụ `1123`). Giá: $12 \times 10k = 120.000đ$.
  - Bao 24: 24 hoán vị (4 chữ số đôi một khác nhau, ví dụ `1234`). Giá: $24 \times 10k = 240.000đ$.

---

## 3. MA TRẬN TEST CASES E2E CHO MAX 4D

### Case 1: Đặt ít nhất (Min Bet)
- **Input**:
  - PlayType: `Max4D`
  - Bảng A: `["7", "8", "9", "0"]` (số `7890`)
  - Multiplier: 10.000đ, 1 kỳ quay.
- **Kỳ vọng**:
  - Tiền cược: 10.000đ.
  - Dò giải:
    - Nếu giải Nhất ra `7890` $\rightarrow$ Trúng 15.000.000đ.
    - Nếu giải Nhất ra `1890` $\rightarrow$ Trúng Khuyến khích 1 (1.000.000đ).
    - Nếu giải Nhất ra `1290` $\rightarrow$ Trúng Khuyến khích 2 (100.000đ).

### Case 2: Đặt nhiều bảng & Multiplier cao
- **Input**:
  - 6 bảng A-F mỗi bảng 1 số 4 chữ số.
  - Multiplier: 100.000đ / bảng (x10).
  - 1 kỳ quay.
- **Kỳ vọng**:
  - Tổng tiền: $6 \times 100.000 = \mathbf{600.000đ}$.
  - Giả sử bảng B trúng giải Nhì $\rightarrow$ Thưởng nhận = $6.500.000 \times 10 = \mathbf{65.000.000đ}$.

### Case 3: Chơi Bao 24 (Tất cả hoán vị)
- **Input**:
  - Số chọn: `1234`
  - Số hoán vị: 24 bộ số.
  - Tổng tiền = $24 \times 10.000 = 240.000đ$.
