/**
 * スレッドをまとめて1つのノートとして保存するかどうかを判定する
 * @param detectedThreadCount 検出されたスレッドのツイート数
 * @param mergeThreadChecked 「1つのノートにまとめる」チェックボックスの状態
 * @returns スレッドとして保存すべきかどうか
 */
export function shouldSaveAsThread(
  detectedThreadCount: number,
  mergeThreadChecked: boolean
): boolean {
  // スレッドが2件以上検出されていて、かつ「まとめる」がONの場合のみスレッド保存
  return detectedThreadCount > 1 && mergeThreadChecked
}
