# TÀI LIỆU QUY CHUẨN ĐẶC TẢ GAME & CHIẾN LƯỢC TEST E2E (VUAXOSO)

Hệ thống tài liệu này định nghĩa chi tiết toàn bộ các quy luật trò chơi, cấu trúc dữ liệu đặt cược, công thức tính tiền cược từ **đặt ít (min)** đến **đặt nhiều (max / bao / bội số / nhiều kỳ)**, điều kiện trúng thưởng và ma trận test case E2E cho cả 3 thành phần hệ thống:
1. **Mobile App (React Native)**: Giao diện chọn số, tính tiền, thêm giỏ hàng, thanh toán.
2. **Backend (Node.js/Express/MongoDB)**: API Checkout, xác thực vé, trừ tiền ví, quản lý kỳ quay, tự động dò thưởng (`prizeService`).
3. **CMS Frontend (Vite/React/Ant Design)**: Quản lý đơn hàng, xuất vé, upload ảnh vé, nhập kết quả kỳ quay và kích hoạt trả thưởng.

---

## 1. DANH MỤC CÁC TRÒ CHƠI & FILE SPEC CHI TIẾT

| Mã Game (`gameId`) | Tên Trò Chơi | Nhóm | File Đặc Tả Chi Tiết |
| :--- | :--- | :--- | :--- |
| `keno`, `bao_keno`, `clln_keno` | KENO / BAO KENO / CHẴN LẺ LỚN NHỎ | Vietlott (Nhanh 8p) | [`keno.md`](./keno.md) |
| `power_655` | POWER 6/55 | Vietlott Jackpot | [`power_655.md`](./power_655.md) |
| `mega_645` | MEGA 6/45 | Vietlott Jackpot | [`mega_645.md`](./mega_645.md) |
| `max_3d`, `max_3d_pro` | MAX 3D & MAX 3D PRO | Vietlott Số | [`max_3d.md`](./max_3d.md) |
| `max_4d` | MAX 4D | Vietlott Số | [`max_4d.md`](./max_4d.md) |
| `bingo18` | BINGO 18 | Điện toán (Nhanh 8p) | [`bingo18.md`](./bingo18.md) |
| `xoso_3mien` / `lode` | LÔ ĐỀ 3 MIỀN (MB, MT, MN) | Lô Đề Truyền Thống | [`lode_3mien.md`](./lode_3mien.md) |
| `MB`, `MT`, `MN` | XỔ SỐ KIẾN THIẾT 3 MIỀN | XSKT Giấy Truyền Thống | [`kienthiet.md`](./kienthiet.md) |
| `dientoan_636`, `bao_636` | ĐIỆN TOÁN 6X36 & BAO 6X36 | Điện Toán Truyền Thống | [`dientoan_636.md`](./dientoan_636.md) |
| `loto_235` | LÔ TÔ 2, 3, 5 SỐ & BAO LÔ TÔ 2 | Điện Toán / Lô Tô | [`loto_235.md`](./loto_235.md) |
| `loto_cap` | LÔ TÔ 2, 3, 4 CẶP SỐ | Điện Toán / Lô Tô Cặp | [`loto_cap.md`](./loto_cap.md) |
| `truot_loto` | TRƯỢT LÔ TÔ 4-8-10 CẶP | Điện Toán / Lô Tô Trượt | [`truot_loto.md`](./truot_loto.md) |
| `than_tai_4` | THẦN TÀI 4 & ĐIỆN TOÁN 1-2-3 | Điện Toán | [`than_tai_4.md`](./than_tai_4.md) |
| `lotto_535`, `lotto_570` | LOTTO 5/35 & MEGA MILLIONS (5/70) | Xổ Số Quốc Tế / Điện Toán | [`lotto_535_570.md`](./lotto_535_570.md) |

---

## 2. CHUẨN DỮ LIỆU ĐẶT VÉ (PAYLOAD SCHEMA)

Tất cả các màn hình Mobile khi đặt cược (hoặc Giỏ hàng khi Checkout) đều tạo ra payload theo cấu trúc chuẩn sau gửi đến `POST /api/orders/checkout`:

```json
{
  "clearCart": false,
  "orders": [
    {
      "gameType": "keno",
      "playType": "Bậc 2 (1 kỳ)",
      "drawId": "6640abc123456789",
      "drawCode": "#12345",
      "provinceName": null,
      "drawDate": "12/11/2026",
      "items": [
        {
          "id": "A",
          "numbers": ["05", "18"],
          "specialNumbers": [],
          "cost": 10000,
          "baseCost": 10000,
          "unitAmount": 10000,
          "multiplier": 10000
        }
      ]
    }
  ]
}
```

### Quy ước trường dữ liệu:
- `gameType`: Mã định danh game chính (hoặc `MB`/`MT`/`MN` với Kiến Thiết / Lô Đề).
- `playType`: Tên kiểu chơi (e.g. `Bậc 2`, `Bao 7`, `Lô 2 số`, `Đề ĐB`, `Tài Xỉu`).
- `drawId`: ID Object MongoDB của kỳ quay hoặc mã ngày `sched_YYYY-MM-DD` / `DD/MM/YYYY`.
- `drawCode`: Số hiệu kỳ quay (e.g. `#00912`).
- `items`: Danh sách các dãy số / bảng con (Bảng A, B, C, D, E, F hoặc các bộ số).
  - `cost`: Tổng tiền của bảng này = `baseCost * multiplier * drawCount` (hoặc số tổ hợp với vé Bao).
  - `baseCost`: Giá gốc của 1 bộ cược tối thiểu (thường là 10,000đ với Vietlott, hoặc 1,000đ với Lô đề).
  - `multiplier`: Bội số tiền cược (10k, 20k, 50k, 100k, 500k...).

---

## 3. NGUYÊN TẮC TEST E2E "ĐẶT ÍT" ĐẾN "ĐẶT NHIỀU"

Mỗi trò chơi bắt buộc phải được kiểm thử đầy đủ các cấp độ:

```
[Mức 1: Đặt Ít Nhất (Min)]
   │── Chọn 1 bảng (Dãy A duy nhất)
   │── Số lượng số tối thiểu hợp lệ
   │── Mức cược tối thiểu (10,000đ hoặc 1,000đ)
   │── 1 kỳ quay duy nhất
   └── Đặt trực tiếp & kiểm tra trừ tiền chính xác

[Mức 2: Đặt Vừa (Medium)]
   │── Chọn từ 2 - 3 bảng (Dãy A, B, C)
   │── Mức cược x2, x5 (20,000đ, 50,000đ)
   │── Chọn 2 - 3 kỳ quay liên tiếp
   └── Thêm vào giỏ hàng rồi Checkout

[Mức 3: Đặt Nhiều Nhất (Max / Heavy / Stress)]
   │── Kích hoạt tối đa 6 bảng (A -> F) cùng lúc
   │── Sử dụng chế độ Bao lớn nhất (Bao 15, Bao 18, Bao 10 Keno) -> phát sinh hàng trăm/ngàn bộ số
   │── Mức cược tối đa (500,000đ / bảng)
   │── Chọn tối đa số kỳ quay cho phép (ví dụ 10 kỳ quay)
   └── Đơn hàng tổng giá trị lớn, kiểm tra tính toán tổng tiền khớp 100% giữa Mobile, Cart và Backend

[Mức 4: Kiểm Thử Kết Quả & Trả Thưởng (Winning & Payout)]
   │── Cố định bộ kết quả kỳ quay trúng thưởng (Jackpot, Giải Nhất, Trúng Lô nhiều nháy, v.v.)
   │── Gọi `prizeService.processDrawResults(drawId)`
   │── Kiểm tra `Order.isWinner = true`, `Order.prizeAmount` tính chính xác theo multiplier
   │── Kiểm tra `User.balance` được cộng đúng số tiền thưởng
   └── Kiểm tra sinh Transaction và BalanceHistory

[Mức 5: Biên & Lỗi Nghiệp Vụ (Negative Cases)]
   │── Tài khoản không đủ số dư -> Chặn cược, thông báo lỗi rõ ràng
   │── Quá thời gian chốt vé (Cutoff Time) -> Chặn cược
   │── Trùng lặp số trong 1 bảng -> Chặn xác nhận
   └── Số lượng số chưa đủ hoặc vượt quá quy định -> Báo lỗi
