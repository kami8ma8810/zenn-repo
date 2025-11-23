import type { TransformValue, EdgeDetection, BoundaryValues, ImageSize, CropAreaState, ImageOrientation } from '../types';

/**
 * 画像の向きを判定
 *
 * @param imageSize - 画像のサイズ
 * @returns 画像の向き
 */
export const detectImageOrientation = (imageSize: ImageSize): ImageOrientation => {
  if (imageSize.height > imageSize.width) return 'vertical';
  if (imageSize.width > imageSize.height) return 'horizontal';
  return 'square';
};

/**
 * エッジ判定を実行
 *
 * @param currentTransform - 現在のtransform値
 * @param boundary - 境界値
 * @param epsilon - 誤差許容範囲（デフォルト: 0.1）
 * @returns エッジ判定結果
 */
export const detectEdges = (
  currentTransform: TransformValue,
  boundary: BoundaryValues,
  epsilon: number = 0.1
): EdgeDetection => {
  return {
    atLeftEdge: Math.abs(currentTransform.x - boundary.maxX) < epsilon,
    atRightEdge: Math.abs(currentTransform.x - boundary.minX) < epsilon,
    atTopEdge: Math.abs(currentTransform.y - boundary.maxY) < epsilon,
    atBottomEdge: Math.abs(currentTransform.y - boundary.minY) < epsilon,
  };
};

/**
 * エッジアンカリングズームのtranslate値を計算
 *
 * 画像が端にいる場合、その端を固定したままズームする。
 * 長辺方向のみエッジ固定、短辺方向は中央固定。
 *
 * @param imageSize - 画像のサイズ
 * @param cropAreaSize - クロップ領域のサイズ
 * @param currentTransform - 現在のtransform値（state.x, state.y）
 * @param currentScale - 現在のスケール値
 * @param newScale - 新しいスケール値
 * @param initialTranslate - 初期translate値
 * @param edges - エッジ判定結果
 * @returns 新しいtransform値（state.x, state.y）
 */
export const calculateZoomTransform = (
  imageSize: ImageSize,
  cropAreaSize: CropAreaState,
  currentTransform: TransformValue,
  currentScale: number,
  newScale: number,
  initialTranslate: TransformValue,
  edges: EdgeDetection
): TransformValue => {
  // Container の中心
  const containerCenterX = cropAreaSize.width / 2;
  const containerCenterY = cropAreaSize.height / 2;

  // 画像の中心（natural size）
  const imageCenterX = imageSize.width / 2;
  const imageCenterY = imageSize.height / 2;

  // 現在の total translate（INITIAL_TRANSLATE + state）
  const currentTotalTranslateX = initialTranslate.x + currentTransform.x;
  const currentTotalTranslateY = initialTranslate.y + currentTransform.y;

  // 画像の向きを判定（長辺方向のみエッジ固定、短辺方向は中央固定）
  const orientation = detectImageOrientation(imageSize);
  const isVertical = orientation === 'vertical';
  const isHorizontal = orientation === 'horizontal';

  // X方向の新しいtranslate値を計算
  let newTotalTranslateX: number;
  if (isHorizontal && edges.atLeftEdge) {
    // 左端固定: 画像の左端座標 = imageCenterX + totalTranslateX - IMAGE_WIDTH/2 * scale を一定に保つ
    newTotalTranslateX = currentTotalTranslateX + imageSize.width / 2 * (newScale - currentScale);
  } else if (isHorizontal && edges.atRightEdge) {
    // 右端固定: 画像の右端座標 = imageCenterX + totalTranslateX + IMAGE_WIDTH/2 * scale を一定に保つ
    newTotalTranslateX = currentTotalTranslateX + imageSize.width / 2 * (currentScale - newScale);
  } else {
    // 中央固定: クロップ中心が見ている画像上のX座標を固定
    const currentImageX = (containerCenterX - imageCenterX - currentTotalTranslateX) / currentScale + imageCenterX;
    newTotalTranslateX = containerCenterX - imageCenterX - (currentImageX - imageCenterX) * newScale;
  }

  // Y方向の新しいtranslate値を計算
  let newTotalTranslateY: number;
  if (isVertical && edges.atTopEdge) {
    // 上端固定: 画像の上端座標 = imageCenterY + totalTranslateY - IMAGE_HEIGHT/2 * scale を一定に保つ
    newTotalTranslateY = currentTotalTranslateY + imageSize.height / 2 * (newScale - currentScale);
  } else if (isVertical && edges.atBottomEdge) {
    // 下端固定: 画像の下端座標 = imageCenterY + totalTranslateY + IMAGE_HEIGHT/2 * scale を一定に保つ
    newTotalTranslateY = currentTotalTranslateY + imageSize.height / 2 * (currentScale - newScale);
  } else {
    // 中央固定: クロップ中心が見ている画像上のY座標を固定
    const currentImageY = (containerCenterY - imageCenterY - currentTotalTranslateY) / currentScale + imageCenterY;
    newTotalTranslateY = containerCenterY - imageCenterY - (currentImageY - imageCenterY) * newScale;
  }

  // state に戻す（INITIAL_TRANSLATE を引く）
  return {
    x: newTotalTranslateX - initialTranslate.x,
    y: newTotalTranslateY - initialTranslate.y,
  };
};
