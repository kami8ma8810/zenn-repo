import type { TransformValue } from '../types';

/**
 * ドラッグによる新しいtranslate値を計算
 *
 * @param dragStart - ドラッグ開始時の座標
 * @param currentPosition - 現在のマウス座標
 * @param initialTransform - ドラッグ開始時のtransform値
 * @returns 新しいtranslate値
 */
export const calculateDragTransform = (
  dragStart: { x: number; y: number },
  currentPosition: { x: number; y: number },
  initialTransform: TransformValue
): TransformValue => {
  const deltaX = currentPosition.x - dragStart.x;
  const deltaY = currentPosition.y - dragStart.y;

  return {
    x: initialTransform.x + deltaX,
    y: initialTransform.y + deltaY,
  };
};
