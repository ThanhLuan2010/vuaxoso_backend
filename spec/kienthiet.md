# ĐẶC TẢ GAME: XỔ SỐ KIẾN THIẾT 3 MIỀN (`MB`, `MT`, `MN`)

## 1. TỔNG QUAN
- **Mã game**: `MB` (Miền Bắc), `MT` (Miền Trung), `MN` (Miền Nam).
- **Hình thức**: Vé số truyền thống (vé giấy in sẵn trên hệ thống hoặc do đại lý phân phối).
- **Mệnh giá cơ bản**: 10.000đ / vé.
- **Giờ chốt vé (Cutoff)**:
  - Miền Nam: **16:10**
  - Miền Trung: **17:10**
  - Miền Bắc: **18:10**

---

## 2. PHÂN LOẠI VÉ VÀ QUY TẮC MUA

### 2.1. VÉ THƯỜNG (DÃY 5 - 6 CHỮ SỐ)
- Định dạng: Chuỗi 5 hoặc 6 chữ số (ví dụ: `12345` hoặc `123456`).
- **Multiplier (Bội số số lượng vé)**: Một số vé có số lượng sẵn trên kho đại lý (ví dụ có 5 vé cùng số: multiplier = 5).
  - Người chơi có thể mua 1 vé, 2 vé hoặc toàn bộ lốc vé cùng số ($M$ vé).
  - Tiền cược = $\text{Số vé mua} \times 10.000đ$.

### 2.2. VÉ ĐẶC BIỆT (VÉ KÝ HIỆU / VÉ PHỤ `xNNNNN`)
- Định dạng bắt đầu bằng chữ `x` hoặc ký hiệu lốc (ví dụ `x12345`).
- Thường chỉ cho phép mua số lượng 1 vé mỗi mã.

### 2.3. CƠ CẤU GIẢI THƯỞNG XỔ SỐ KIẾN THIẾT

#### Miền Bắc (Vé 5 chữ số):
- **Giải Đặc Biệt**: Trùng cả 5 số và khớp ký hiệu vé $\rightarrow$ **1 Tỷ VNĐ**.
- **Giải Phụ ĐB**: Trùng 5 số giải ĐB khác ký hiệu $\rightarrow$ **20.000.000đ**.
- **Giải Nhất**: Trùng 5 số giải Nhất $\rightarrow$ **10.000.000đ**.
- **Giải Nhì**: Trùng 5 số giải Nhì $\rightarrow$ **5.000.000đ**.
- **Giải Ba**: Trùng 5 số giải Ba $\rightarrow$ **1.000.000đ**.
- **Giải Tư**: Trùng 4 số giải Tư $\rightarrow$ **400.000đ**.
- **Giải Năm**: Trùng 4 số giải Năm $\rightarrow$ **200.000đ**.
- **Giải Sáu**: Trùng 3 số giải Sáu $\rightarrow$ **100.000đ**.
- **Giải Bảy**: Trùng 2 số giải Bảy $\rightarrow$ **40.000đ**.
- **Giải Khuyến Khích**: Trùng 2 số cuối giải ĐB $\rightarrow$ **40.000đ**.

#### Miền Nam & Miền Trung (Vé 6 chữ số):
- **Giải Đặc Biệt**: Trùng 6 số giải ĐB $\rightarrow$ **2 Tỷ VNĐ**.
- **Giải Phụ ĐB**: Trúng 5 số cuối giải ĐB $\rightarrow$ **50.000.000đ**.
- **Giải Nhất**: Trùng 5 số giải Nhất $\rightarrow$ **30.000.000đ**.
- **Giải Nhì**: Trùng 5 số giải Nhì $\rightarrow$ **15.000.000đ**.
- **Giải Ba**: Trùng 5 số giải Ba $\rightarrow$ **10.000.000đ**.
- **Giải Tư**: Trùng 5 số giải Tư $\rightarrow$ **3.000.000đ**.
- **Giải Năm**: Trùng 4 số giải Năm $\rightarrow$ **1.000.000đ**.
- **Giải Sáu**: Trùng 4 số giải Sáu $\rightarrow$ **400.000đ**.
- **Giải Bảy**: Trùng 3 số giải Bảy $\rightarrow$ **200.000đ**.
- **Giải Tám**: Trùng 2 số giải Tám $\rightarrow$ **100.000đ**.

---

## 3. MA TRẬN TEST CASES E2E CHO XỔ SỐ KIẾN THIẾT

### Case 1: Mua 1 vé đơn tối thiểu (Min Bet)
- **Input**:
  - Tỉnh/Đài: `TP. Hồ Chí Minh` (Miền Nam)
  - Chọn 1 vé: số `456789`, số lượng: 1 vé.
- **Kỳ vọng**:
  - Tiền thanh toán: 10.000đ.
  - Backend lưu vé, trạng thái `pending` chờ đại lý chụp ảnh vé vật lý lên CMS.

### Case 2: Mua lốc nhiều vé cùng số (Multiplier)
- **Input**:
  - Vé có sẵn multiplier: 5 vé (cùng số `888999`).
  - Chọn mua cả lốc 5 vé.
- **Kỳ vọng**:
  - Tiền cược = $5 \times 10.000đ = \mathbf{50.000đ}$.
  - Nếu trúng giải Tám (100.000đ/vé) $\rightarrow$ Tổng tiền thưởng nhận = $5 \times 100.000đ = \mathbf{500.000đ}$.

### Case 3: Mua nhiều vé khác nhau cùng giỏ hàng (Batch Cart Checkout)
- **Input**:
  - Chọn 10 vé số của các đài khác nhau (Đồng Nai, Cần Thơ, Bình Dương).
  - Tổng cộng 15 vé đơn.
- **Kỳ vọng**:
  - Tiền thanh toán = $15 \times 10.000đ = \mathbf{150.000đ}$.
  - Checkout thành công trong 1 request duy nhất.

### Case 4: Kiểm tra giờ Cutoff
- Đài miền Nam hôm nay: Đặt vé lúc 16:11 $\rightarrow$ **Bị từ chối ngay lập tức**, báo lỗi "Đài đã quá thời gian chốt vé hôm nay".
- Chuyển sang ngày mai $\rightarrow$ Đặt vé thành công.
