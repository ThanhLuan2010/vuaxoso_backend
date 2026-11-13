# ĐẶC TẢ GAME: ĐIỆN TOÁN 6X36 & BAO 6X36 (`dientoan_636`, `bao_636`)

## 1. TỔNG QUAN
- **Mã game**: `dientoan_636`, `bao_636`.
- **Lịch quay**: Thứ Tư và Thứ Bảy hàng tuần lúc 18:15.
- **Quy luật quay thưởng**: Mỗi kỳ quay chọn **6 quả bóng** ngẫu nhiên từ tập hợp **01 đến 36** (không trùng lặp).

---

## 2. CÁC HÌNH THỨC CHƠI & TÍNH TIỀN

### 2.1. CƠ BẢN (ĐIỆN TOÁN 6X36 ĐƠN)
- Chọn đúng **6 số** khác nhau trong khoảng `[01 .. 36]`.
- Bảng A đến F (tối đa 6 bảng).
- Giá cược: 10.000đ / bảng / kỳ. Có thể nâng bội số cược.

### 2.2. BAO 6X36
- Chọn từ **7 đến 18 số** trong khoảng `[01 .. 36]`.
- Số bộ 6 số được sinh ra:
  $$C(N, 6) = \frac{N!}{6!(N - 6)!}$$
- **Giá cược**:
  - Bao 7: $C(7, 6) = 7$ bộ $\rightarrow$ **70.000đ**
  - Bao 8: $C(8, 6) = 28$ bộ $\rightarrow$ **280.000đ**
  - Bao 9: $C(9, 6) = 84$ bộ $\rightarrow$ **840.000đ**
  - Bao 10: $C(10, 6) = 210$ bộ $\rightarrow$ **2.100.000đ**
  - Bao 12: $C(12, 6) = 924$ bộ $\rightarrow$ **9.240.000đ**
  - Bao 15: $C(15, 6) = 5.005$ bộ $\rightarrow$ **50.050.000đ**
  - Bao 18: $C(18, 6) = 18.564$ bộ $\rightarrow$ **185.640.000đ**

---

## 3. CƠ CẤU GIẢI THƯỞNG

| Giải Thưởng | Điều Kiện Trúng | Tiền Thưởng Cơ Sở (VNĐ) |
| :--- | :--- | :--- |
| **Giải Đặc Biệt** | Trùng đủ **6 số** | Tối thiểu 2 Tỷ VNĐ (Cố định trong hệ thống: 2.000.000.000đ) |
| **Giải Nhất** | Trùng đúng **5 số** | **1.800.000đ** |
| **Giải Nhì** | Trùng đúng **4 số** | **100.000đ** |
| **Giải Ba** | Trùng đúng **3 số** | **15.000đ** |

---

## 4. MA TRẬN TEST CASES E2E CHO ĐIỆN TOÁN 6X36

### Case 1: Đặt ít nhất (Min Bet)
- **Input**:
  - PlayType: `Cơ bản`
  - Bảng A: `["05", "12", "18", "24", "30", "36"]` (6 số trong 01-36).
  - Multiplier: 10.000đ, 1 kỳ quay.
- **Kỳ vọng**:
  - Tiền cược: 10.000đ.
  - Kết quả:
    - Trùng 3 số $\rightarrow$ Thưởng 15.000đ.
    - Trùng 4 số $\rightarrow$ Thưởng 100.000đ.
    - Trùng 5 số $\rightarrow$ Thưởng 1.800.000đ.
    - Trùng 6 số $\rightarrow$ Thưởng 2.000.000.000đ.

### Case 2: Chơi Bao 7 & Bao 8
- **Input**:
  - PlayType: `Bao 7`
  - 7 số: `["01", "08", "15", "22", "29", "33", "36"]`.
- **Kỳ vọng**:
  - Tiền cược: 70.000đ.
  - Nếu kết quả trúng 4 số $\rightarrow$ Trúng các giải Nhì và Ba theo công thức tổ hợp.

### Case 3: Chơi Bao lớn (Bao 10 - Heavy)
- **Input**:
  - PlayType: `Bao 10` (10 số).
- **Kỳ vọng**:
  - Tiền cược: $210 \times 10.000 = \mathbf{2.100.000đ}$.
  - Backend xử lý trơn tru và lưu toàn bộ 210 tổ hợp.
