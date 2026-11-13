# ĐẶC TẢ GAME: LÔ ĐỀ 3 MIỀN (`xoso_3mien` / `lode`)

## 1. TỔNG QUAN
- **Mã game**: `xoso_3mien` (hoặc `lode`, vùng cược `MB`, `MT`, `MN`).
- **Nguồn kết quả**: Kết quả mở thưởng Xổ số Kiến Thiết truyền thống của 3 miền:
  - **Miền Bắc (MB)**: 27 giải mở lúc 18:15 hàng ngày.
  - **Miền Trung (MT)**: 18 giải mở lúc 17:15 hàng ngày theo các đài tỉnh.
  - **Miền Nam (MN)**: 18 giải mở lúc 16:15 hàng ngày theo các đài tỉnh.
- **Thời gian chốt vé (Cutoff Time)**:
  - Miền Nam: **16:10**
  - Miền Trung: **17:10**
  - Miền Bắc: **18:10**
  - Quá giờ chốt vé hôm nay: Hệ thống **chặn hoàn toàn** không cho đặt cược cho ngày hôm nay (chỉ cho phép đặt vé kỳ tương lai).

---

## 2. BẢNG TỈ LỆ THƯỞNG VÀ BỘI SỐ CƯỢC (`BET_DATA`)

### 2.1. MIỀN BẮC (MB - 27 GIẢI)

| Danh Mục | Tên Loại Cược | Bội Số Cược (Hệ Số Nhân Tiền Đánh) | Tỉ Lệ Ăn (1 ăn X) | Quy Luật Trúng |
| :--- | :--- | :---: | :---: | :--- |
| **Bao Lô** | **Lô 2 số** | **x27** | **99.9** | 2 số cuối của 27 giải MB. Trúng bao nhiêu nháy ăn bấy nhiêu lần. |
| | Lô 2 số 1k | x1 | 3.7 | Đánh 1k ăn 3.7k (tương đương 1 con lô) |
| | Lô Giải 3 | x6 | 99.9 | 2 số cuối 6 giải Ba |
| | Lô Giải 5 | x6 | 99.9 | 2 số cuối 6 giải Năm |
| | Lô 2 số đầu | x27 | 99.9 | 2 số đầu 27 giải |
| | **Lô 3 số** | **x23** | **980** | 3 số cuối của 23 giải (từ giải 6 lên giải ĐB) |
| | **Lô 4 số** | **x20** | **9000** | 4 số cuối của 20 giải (từ giải 5 lên giải ĐB) |
| **Đề** | **Đề ĐB** | **x1** | **99.9** | 2 số cuối của giải Đặc Biệt |
| | Đề Đầu ĐB | x1 | 99.9 | 2 số đầu của giải Đặc Biệt |
| | Đề giải 1 | x1 | 99.9 | 2 số cuối của giải Nhất |
| | Đề đầu giải 1 | x1 | 99.9 | 2 số đầu của giải Nhất |
| | Đề giải 7 | x4 | 99.9 | 2 số cuối 4 giải Bảy |
| | Đề đầu | x10 | 99.9 | Chữ số hàng chục của giải ĐB (0-9) |
| | Đề đuôi | x10 | 99.9 | Chữ số hàng đơn vị của giải ĐB (0-9) |
| | Đề đầu đuôi | x5 | 99.9 | 2 số đầu giải 1 và 2 số cuối giải ĐB |
| | Xiên ĐB | x1 | 4.8 | Trúng 1 trong 2 số của 2 số cuối giải ĐB |
| | Xiên giải 1 | x1 | 4.8 | Trúng 1 trong 2 số của 2 số cuối giải Nhất |
| **Xiên** | **Xiên 2** | **x1** | **16** | Chọn 2 con lô 2 số, cả 2 con đều phải xuất hiện trong 27 giải |
| | **Xiên 3** | **x1** | **65** | Chọn 3 con lô 2 số, cả 3 con đều phải xuất hiện |
| | **Xiên 4** | **x1** | **180** | Chọn 4 con lô 2 số, cả 4 con đều phải xuất hiện |
| **3 Càng** | **3 Càng ĐB** | **x1** | **980** | 3 số cuối giải Đặc Biệt |
| | 3 Càng đầu ĐB | x1 | 980 | 3 số đầu giải Đặc Biệt |
| | 3 Càng giải 6 | x3 | 980 | 3 số cuối 3 giải Sáu |
| | 3 Càng giải 1 | x1 | 980 | 3 số cuối giải Nhất |
| | 3 Càng đầu giải 1 | x1 | 980 | 3 số đầu giải Nhất |
| | 3 Càng đầu đuôi | x4 | 980 | Ghép giải 6 và giải ĐB |
| | Xiên 3 càng ĐB | x1 | 3.2 | Trúng 1 trong các chữ số 3 càng |
| **4 Càng** | **4 Càng ĐB** | **x1** | **9000** | 4 số cuối giải Đặc Biệt |
| | 4 Càng đầu ĐB | x1 | 9000 | 4 số đầu giải Đặc Biệt |
| | 4 Càng giải 1 | x1 | 9000 | 4 số cuối giải Nhất |
| | 4 Càng đầu giải 1 | x1 | 9000 | 4 số đầu giải Nhất |
| | Xiên 4 càng ĐB | x1 | 2.4 | |
| **Lô Trượt** | **Trượt Xiên 4** | **x1** | **1.8** | Cả 4 con lô không con nào xuất hiện trong 27 giải |
| | **Trượt Xiên 6** | **x1** | **2.5** | Cả 6 con lô không con nào xuất hiện |
| | **Trượt Xiên 8** | **x1** | **3.3** | Cả 8 con lô không con nào xuất hiện |
| | **Trượt Xiên 10** | **x1** | **4.3** | Cả 10 con lô không con nào xuất hiện |

---

### 2.2. MIỀN TRUNG (MT) & MIỀN NAM (MN) - 18 GIẢI

| Danh Mục | Tên Loại Cược | Bội Số Cược | Tỉ Lệ Ăn | Ghi Chú |
| :--- | :--- | :---: | :---: | :--- |
| **Bao Lô** | **Lô 2 số** | **x18** | **99.9** | 2 số cuối của 18 giải đài tỉnh |
| | Lô 2 số 1k | x1 | 5.445 | |
| | Lô Giải 4 | x7 | 99.9 | 2 số cuối 7 giải Tư |
| | Lô Giải 6 | x3 | 99.9 | 2 số cuối 3 giải Sáu |
| | Lô 2 số đầu | x18 | 99.9 | 2 số đầu 18 giải |
| | **Lô 3 số** | **x17** | **980** | 3 số cuối 17 giải |
| | **Lô 4 số** | **x16** | **9000** | 4 số cuối 16 giải |
| **Đề** | **Đề ĐB** | **x1** | **99.9** | 2 số cuối giải ĐB |
| | Đề Đầu ĐB | x1 | 99.9 | 2 số đầu giải ĐB |
| | Đề giải 1 | x1 | 99.9 | 2 số cuối giải Nhất |
| | Đề giải 8 | x1 | 99.9 | 2 số giải Tám |
| | Đề đầu đuôi | x2 | 99.9 | Giải 8 và giải ĐB |
| **Xiên** | **Xiên 2** | **x1** | **28** | Cả 2 con lô cùng về trong 18 giải |
| | **Xiên 3** | **x1** | **150** | Cả 3 con lô cùng về trong 18 giải |
| | **Xiên 4** | **x1** | **750** | Cả 4 con lô cùng về trong 18 giải |
| **3 Càng** | **3 Càng ĐB** | **x1** | **980** | 3 số cuối giải ĐB |
| | 3 Càng giải 7 | x1 | 980 | 3 số giải Bảy |
| | 3 Càng đầu đuôi | x2 | 980 | Giải 7 và giải ĐB |
| **4 Càng** | **4 Càng ĐB** | **x1** | **9000** | 4 số cuối giải ĐB |
| **Lô Trượt** | **Trượt Xiên 4** | **x1** | **1.8** | Cả 4 con không xuất hiện trong 18 giải |
| | **Trượt Xiên 6** | **x1** | **2.5** | |
| | **Trượt Xiên 8** | **x1** | **3.3** | |
| | **Trượt Xiên 10** | **x1** | **4.3** | |

---

## 3. CÔNG THỨC TÍNH TIỀN CƯỢC VÀ TIỀN THƯỞNG

### 3.1. Tiền Cược (Cost)
$$\text{Cost} = \text{Số lượng con số} \times \text{Tiền cược mỗi con (baseCost)} \times \text{Multiplier (bội số giải)}$$
- Ví dụ 1 con Lô 2 số MB cược 10.000đ:
  $$\text{Cost} = 1 \times 10.000đ \times 27 = \mathbf{270.000đ}$$
- Ví dụ đánh 3 con đề ĐB MB (`23, 45, 67`), mỗi con 50.000đ:
  $$\text{Cost} = 3 \times 50.000đ \times 1 = \mathbf{150.000đ}$$
- Ví dụ 1 vé Lô Xiên 2 MB (`18 - 81`), cược 20.000đ:
  $$\text{Cost} = 1 \times 20.000đ \times 1 = \mathbf{20.000đ}$$

### 3.2. Tiền Thưởng (Prize)
- Với Đề, 3 Càng, 4 Càng, Xiên, Lô trượt:
  $$\text{Prize} = \text{baseCost} \times \text{Rate}$$
- Với Bao Lô:
  $$\text{Prize} = \text{baseCost} \times \text{Rate} \times \text{Số nháy về}$$
  *Ví dụ: Đánh con Lô `18` với baseCost 10.000đ. Kết quả bảng 27 giải MB có 3 giải kết thúc bằng `18` (về 3 nháy) $\rightarrow$ Tiền thưởng = $10.000 \times 99.9 \times 3 = \mathbf{2.997.000đ}$.*

---

## 4. MA TRẬN TEST CASES E2E CHO LÔ ĐỀ 3 MIỀN

### Case 1: Đặt ít nhất (Min Bet)
- **Subcase 1A (Đề ĐB MB 1 con tối thiểu)**:
  - Miền: `MB`, Loại: `Đề ĐB`, Số: `["88"]` (1 con).
  - baseCost: 1.000đ (hoặc 10.000đ), Multiplier = 1.
  - Tổng tiền: 10.000đ.
  - Kết quả: Giải ĐB về `...88` $\rightarrow$ Trúng $10k \times 99.9 = 999.000đ$.
- **Subcase 1B (Bao Lô 2 số MB 1 con tối thiểu)**:
  - Miền: `MB`, Loại: `Lô 2 số`, Số: `["68"]` (1 con).
  - baseCost: 1.000đ.
  - Tổng tiền = $1 \times 1.000đ \times 27 = \mathbf{27.000đ}$.
  - Kết quả: `68` về 1 nháy $\rightarrow$ Thưởng $1.000 \times 99.9 = 99.900đ$.

### Case 2: Đặt nhiều con số (Dàn đề / Dàn lô)
- **Input**:
  - Đánh dàn đề 10 con: `["01", "12", "23", "34", "45", "56", "67", "78", "89", "90"]`.
  - baseCost: 20.000đ / con.
- **Kỳ vọng**:
  - Tổng tiền = $10 \times 20.000đ \times 1 = \mathbf{200.000đ}$.
  - Backend trừ ví 200.000đ.
  - Nếu giải ĐB về số `34` $\rightarrow$ Trúng $20.000 \times 99.9 = 1.998.000đ$.

### Case 3: Đặt Lô Xiên (Xiên 2, Xiên 3, Xiên 4)
- **Xiên 2 MB**: Cặp `["12", "34"]`, cược 50.000đ.
  - Bảng 27 giải có cả `12` và `34` $\rightarrow$ Trúng $50.000 \times 16 = \mathbf{800.000đ}$.
  - Nếu có `12` nhưng không có `34` $\rightarrow$ Thua 0đ.
- **Xiên 3 MN (18 giải)**: Bộ 3 `["11", "22", "33"]`, cược 10.000đ.
  - Cả 3 số cùng về trong 18 giải đài tỉnh $\rightarrow$ Trúng $10.000 \times 150 = \mathbf{1.500.000đ}$.

### Case 4: Đặt cược lớn (Heavy Bet - Bao 3 số & 4 số)
- **Input**:
  - Bao 3 số MB: 2 con `["123", "456"]`, baseCost = 10.000đ / con.
  - Hệ số nhân MB = x23.
  - Chi phí = $2 \times 10.000đ \times 23 = \mathbf{460.000đ}$.
  - Trúng 1 con 3 số $\rightarrow$ Thưởng $10.000 \times 980 = \mathbf{9.800.000đ}$.

### Case 5: Lô Trượt
- **Input**:
  - Trượt Xiên 4 MB: 4 con `["00", "01", "02", "03"]`, cược 100.000đ.
  - Cả 4 con đều không xuất hiện trong 27 giải $\rightarrow$ Trúng $100.000 \times 1.8 = \mathbf{180.000đ}$.

### Case 6: Kiểm tra giờ chốt vé (Cutoff Boundary)
- Lúc 16:15 cố tình đặt vé MN hôm nay $\rightarrow$ **Bị chặn**, báo lỗi "Đài đã quá thời gian chốt vé hôm nay".
- Lúc 17:15 cố tình đặt vé MT hôm nay $\rightarrow$ **Bị chặn**.
- Lúc 18:15 cố tình đặt vé MB hôm nay $\rightarrow$ **Bị chặn**.
- Đặt vé cho ngày mai (tương lai) $\rightarrow$ Hợp lệ, chấp nhận đặt cược.
