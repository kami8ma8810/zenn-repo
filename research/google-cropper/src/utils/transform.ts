import type { TransformValue, BoundaryValues, CropAreaState, ImageSize } from '../types';

/**
 * クロップ領域を完全にカバーするための最小スケールを計算
 *
 * @param imageSize - 画像のサイズ
 * @param cropAreaSize - クロップ領域のサイズ
 * @returns 最小スケール値
 */
export const calculateInitialScale = (
  imageSize: ImageSize,
  cropAreaSize: CropAreaState
): number => {
  return Math.max(
    cropAreaSize.width / imageSize.width,
    cropAreaSize.height / imageSize.height
  );
};

/**
 * 初期translate値を計算（画像を中央に配置）
 *
 * @param imageSize - 画像のサイズ
 * @param initialScale - 初期スケール値
 * @returns 初期translate値
 */
export const calculateInitialTranslate = (
  imageSize: ImageSize,
  initialScale: number
): TransformValue => {
  return {
    x: -imageSize.width / 2 * (1 - initialScale),
    y: -imageSize.height / 2 * (1 - initialScale),
  };
};

/**
 * ドラッグ範囲の制限を計算
 *
 * @param imageSize - 画像のサイズ
 * @param cropAreaSize - クロップ領域のサイズ
 * @param scale - 現在のスケール値
 * @param initialTranslate - 初期translate値
 * @returns 境界値（min/max）
 */
export const calculateBoundary = (
  imageSize: ImageSize,
  cropAreaSize: CropAreaState,
  scale: number,
  initialTranslate: TransformValue
): BoundaryValues => {
  // total translate の最大値・最小値
  const maxTotalTx = -imageSize.width / 2 * (1 - scale);
  const minTotalTx = cropAreaSize.width - imageSize.width / 2 * (1 + scale);
  const maxTotalTy = -imageSize.height / 2 * (1 - scale);
  const minTotalTy = cropAreaSize.height - imageSize.height / 2 * (1 + scale);

  // state.x/y の制限（INITIAL_TRANSLATE を引く）
  return {
    minX: minTotalTx - initialTranslate.x,
    maxX: maxTotalTx - initialTranslate.x,
    minY: minTotalTy - initialTranslate.y,
    maxY: maxTotalTy - initialTranslate.y,
  };
};

/**
 * translate値をクランプ（境界内に制限）
 *
 * @param value - translate値
 * @param boundary - 境界値
 * @returns クランプされたtranslate値
 */
export const clampTransform = (
  value: TransformValue,
  boundary: BoundaryValues
): TransformValue => {
  return {
    x: Math.max(boundary.minX, Math.min(boundary.maxX, value.x)),
    y: Math.max(boundary.minY, Math.min(boundary.maxY, value.y)),
  };
};
