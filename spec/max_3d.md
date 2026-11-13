# ĐẶC TẢ GAME: MAX 3D & MAX 3D PRO (`max_3d`, `max_3d_pro`)

## 1. TỔNG QUAN
- **Mã game**: `max_3d` (Max 3D / Max 3D+), `max_3d_pro` (Max 3D Pro).
- **Lịch quay**:
  - `max_3d`: Thứ Hai, Thứ Tư, Thứ Sáu hàng tuần lúc 18:00.
  - `max_3d_pro`: Thứ Ba, Thứ Năm, Thứ Bảy hàng tuần lúc 18:00.
- **Quy luật quay thưởng**: Mỗi kỳ quay mở thưởng **20 bộ ba chữ số** (từ `000` đến `999`), chia thành các hạng giải:
  - 2 bộ giải Đặc biệt
  - 4 bộ giải Nhất
  - 6 bộ giải Nhì
  - 8 bộ giải Ba

---

## 2. CÁC HÌNH THỨC CHƠI & CÔNG THỨC TÍNH TIỀN

### 2.1. MAX 3D CƠ BẢN
- Người chơi chọn **1 bộ gồm 3 chữ số** (từ `000` đến `999`), ví dụ: `123`.
- Bảng A đến F (tối đa 6 bảng).
- Giá cược: 10.000đ / bảng / kỳ. Có thể nâng bội số cược.
- **Cơ cấu giải**:
  - Trúng Giải ĐB (khớp 1 trong 2 bộ ĐB): **1.000.000đ**
  - Trúng Giải Nhất (khớp 1 trong 4 bộ Nhất): **350.000đ**
  - Trúng Giải Nhì (khớp 1 trong 6 bộ Nhì): **210.000đ**
  - Trúng Giải Ba (khớp 1 trong 8 bộ Ba): **100.000đ**

### 2.2. MAX 3D+ (MAX 3D CỘNG)
- Người chơi chọn **2 bộ ba chữ số** (mỗi bộ 3 số, tổng cộng 6 chữ số), ví dụ: `123` và `456`.
- Giá cược: 10.000đ / bảng.
- **Cơ cấu giải Max 3D+**:
  - **Giải ĐB**: Trùng 2 bộ số quay thưởng của giải ĐB $\rightarrow$ **1.000.000.000đ (1 Tỷ)**.
  - **Giải Nhất**: Trùng 2 trong 4 bộ số giải Nhất $\rightarrow$ **40.000.000đ**.
  - **Giải Nhì**: Trùng 2 trong 6 bộ số giải Nhì $\rightarrow$ **10.000.000đ**.
  - **Giải Ba**: Trùng 2 trong 8 bộ số giải Ba $\rightarrow$ **5.000.000đ**.
  - **Giải Tư**: Trùng 1 bộ giải ĐB và 1 bộ bất kỳ thuộc Nhất/Nhì/Ba $\rightarrow$ **100.000đ**.
  - **Giải Năm**: Trùng 2 bộ bất kỳ thuộc Nhất/Nhì/Ba $\rightarrow$ **40.000đ**.
  - **Giải Sáu**: Trùng 1 bộ bất kỳ thuộc Nhất/Nhì/Ba (bộ còn lại trật) $\rightarrow$ **40.000đ**.

### 2.3. MAX 3D PRO
- Người chơi chọn **2 bộ ba chữ số** (bộ trước và bộ sau), ví dụ `123` - `456`.
- **Cơ cấu giải Max 3D Pro**:
  - **Giải ĐB**: Trùng cả 2 bộ giải ĐB theo **đúng thứ tự** $\rightarrow$ **2.000.000.000đ (2 Tỷ)**.
  - **Giải Phụ ĐB**: Trùng cả 2 bộ giải ĐB nhưng **ngược thứ tự** $\rightarrow$ **400.000.000đ**.
  - **Giải Nhất**: Trùng 2 trong 4 bộ giải Nhất $\rightarrow$ **30.000.000đ**.
  - **Giải Nhì**: Trùng 2 trong 6 bộ giải Nhì $\rightarrow$ **10.000.000đ**.
  - **Giải Ba**: Trùng 2 trong 8 bộ giải Ba $\rightarrow$ **4.000.000đ**.
  - **Giải Tư**: Trùng 1 bộ ĐB + 1 bộ khác $\rightarrow$ **1.000.000đ**.
  - **Giải Năm**: Trùng 2 bộ bất kỳ thuộc Nhất/Nhì/Ba $\rightarrow$ **100.000đ**.
  - **Giải Sáu**: Trùng 1 bộ thuộc Nhất/Nhì/Ba $\rightarrow$ **40.000đ**.

---

## 3. MA TRẬN TEST CASES E2E CHO MAX 3D & MAX 3D PRO

### Case 1: Đặt ít nhất (Min Bet)
- **Input**:
  - Game: `max_3d`, PlayType: `Max3D`
  - Bảng A: `["1", "2", "3"]` (số `123`)
  - Multiplier: 10.000đ, 1 kỳ quay.
- **Kỳ vọng**:
  - Tiền cược: 10.000đ.
  - Dò giải: Nếu kết quả giải ĐB có `123` $\rightarrow$ Nhận thưởng 1.000.000đ.

### Case 2: Max 3D+ và Max 3D Pro (2 bộ số)
- **Input**:
  - Game: `max_3d`, PlayType: `Max3D+`
  - Bảng A: `["1", "2", "3", "4", "5", "6"]` (gồm `123` và `456`)
  - Multiplier: 20.000đ (x2)
  - 1 kỳ quay.
- **Kỳ vọng**:
  - Tiền cược = $20.000đ$.
  - Nếu kết quả 2 bộ giải ĐB về đúng `123` và `456` $\rightarrow$ Trúng Jackpot $1 \text{ Tỷ} \times 2 = \mathbf{2.000.000.000đ}$.

### Case 3: Đặt nhiều bảng A-F với nhiều kỳ
- **Input**:
  - Đặt 6 bảng A, B, C, D, E, F với 6 cặp số khác nhau.
  - Multiplier: 50.000đ / bảng.
  - Chọn 3 kỳ quay liên tiếp.
- **Kỳ vọng**:
  - Chi phí = $6 \times 50.000 \times 3 = \mathbf{900.000đ}$.
  - Backend tạo đơn thành công, trừ đúng 900.000đ.

### Case 4: Biên & Ngoại lệ
- Chọn thiếu chữ số (chỉ nhập 2 chữ số trong 1 bộ) $\rightarrow$ Không thể xác nhận.
- Nhập ký tự không phải số $\rightarrow$ Bị loại bỏ.
- Tài khoản thiếu số dư $\rightarrow$ Báo lỗi.
