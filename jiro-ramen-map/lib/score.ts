/**
 * 口コミ数が少ない店舗の評価が過大評価されないよう、
 * ベイズ平均(IMDb方式の加重評価)でおすすめスコアを計算する。
 *
 * score = (n / (n + m)) * rating + (m / (n + m)) * globalAverage
 *
 * n: その店の口コミ数, m: 平滑化の強さ(口コミ数がこの値程度で
 * 全体平均の影響と店舗自体の評価の影響がほぼ半々になる)
 */
const SMOOTHING = 20;

export function computeScore(
  rating: number,
  reviewCount: number,
  globalAverage: number,
  m: number = SMOOTHING
): number {
  if (reviewCount <= 0) return 0;
  return (reviewCount / (reviewCount + m)) * rating + (m / (reviewCount + m)) * globalAverage;
}

export function computeGlobalAverage(
  shops: { rating: number | null; review_count: number | null }[]
): number {
  const rated = shops.filter(
    (s): s is { rating: number; review_count: number } =>
      s.rating !== null && s.review_count !== null && s.review_count > 0
  );
  if (rated.length === 0) return 4.0;
  const sum = rated.reduce((acc, s) => acc + s.rating, 0);
  return sum / rated.length;
}
