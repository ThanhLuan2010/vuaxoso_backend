# ĐẶC TẢ GAME: THẦN TÀI 4 & ĐIỆN TOÁN 1-2-3 (`than_tai_4`)

## 1. TỔNG QUAN
- **Mã game**: `than_tai_4`
- **Lịch quay**: Mở thưởng hàng ngày lúc 18:05.
- **Quy luật quay**:
  - **Thần Tài 4**: Quay chọn 1 bộ **4 chữ số** (từ `0000` đến `9999`).
  - **Điện Toán 1-2-3**: Quay 3 bộ số: Bộ 1 (1 số từ 0-9), Bộ 2 (2 số từ 00-99), Bộ 3 (3 số từ 000-999).

---

## 2. CƠ CẤU GIẢI THƯỞNG

### 2.1. THẦN TÀI 4
- Người chơi chọn 4 chữ số (ví dụ: `1989`).
- **Giải Nhất**: Trùng cả 4 chữ số $\rightarrow$ Thưởng **x1.220 lần** (hoặc theo quỹ giải thưởng).
- **Giải Nhì**: Trùng 3 chữ số đầu $\rightarrow$ Thưởng **x110 lần**.
- **Giải Ba**: Trùng 3 chữ số cuối $\rightarrow$ Thưởng **x110 lần**.
- **Giải Khuyến khích**: Trùng 2 chữ số đầu hoặc 2 chữ số cuối $\rightarrow$ Thưởng **x10 lần**.

### 2.2. ĐIỆN TOÁN 1-2-3
- Chọn 1 bộ gồm: 1 số hàng đơn vị + 2 số hàng chục + 3 số hàng trăm (ví dụ: `5` - `28` - `789`).
- **Giải Nhất**: Trùng cả 3 bộ số $\rightarrow$ Thưởng **x40.000 lần**.
- **Giải Nhì**: Trùng bộ 2 số + bộ 3 số $\rightarrow$ Thưởng **x1.000 lần**.
- **Giải Ba**: Trùng bộ 1 số + bộ 3 số $\rightarrow$ Thưởng **x100 lần**.
- **Giải Tư**: Trùng bộ 3 số $\rightarrow$ Thưởng **x50 lần**.

---

## 3. MA TRẬN TEST CASES E2E CHO THẦN TÀI 4

### Case 1: Thần Tài 4 tối thiểu
- **Input**:
  - Số chọn: `["1", "9", "8", "9"]` (số `1989`)
  - Cược: 10.000đ.
- **Kỳ vọng**:
  - Tiền cược: 10.000đ.
  - Kết quả ra `1989` $\rightarrow$ Trúng giải Nhất.
  - Kết quả ra `1980` $\rightarrow$ Trúng 3 số đầu.
