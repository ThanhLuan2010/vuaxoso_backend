import Counter from '../models/Counter';

/**
 * Chuyển đổi chỉ số prefix thành chữ cái:
 * 0 -> 'a', 1 -> 'b', ..., 25 -> 'z', 26 -> 'aa', 27 -> 'ab', ...
 */
export function getLetterPrefix(index: number): string {
  let prefix = '';
  let n = index;
  while (n >= 0) {
    prefix = String.fromCharCode(97 + (n % 26)) + prefix;
    n = Math.floor(n / 26) - 1;
  }
  return prefix;
}

/**
 * Sinh mã đơn cược dạng ngắn: a_0000001 -> a_9999999 -> b_0000001...
 * @param count Số lượng mã cần cấp phát tuần tự (cho đơn lẻ hoặc giỏ hàng nhiều vé)
 */
export async function getNextOrderIds(count = 1): Promise<string[]> {
  if (count <= 0) return [];

  const counter: any = await Counter.findByIdAndUpdate(
    'order_id',
    { $inc: { seq: count } },
    { new: true, upsert: true, returnDocument: 'after' }
  );

  const endSeq = (counter && typeof counter.seq === 'number') ? counter.seq : count;
  const startSeq = endSeq - count + 1;
  const ids: string[] = [];

  for (let s = startSeq; s <= endSeq; s++) {
    // Mỗi ký tự chữ chứa tối đa 9,999,999 số (từ 0000001 đến 9999999)
    const prefixIndex = Math.floor((s - 1) / 9999999);
    const numInPrefix = ((s - 1) % 9999999) + 1;
    const prefix = getLetterPrefix(prefixIndex);
    const numStr = String(numInPrefix).padStart(7, '0');
    ids.push(`${prefix}_${numStr}`);
  }

  return ids;
}
