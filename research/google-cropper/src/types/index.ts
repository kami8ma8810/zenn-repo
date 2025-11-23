/**
 * クロッパーの状態
 */
export interface CropperState {
  /** X方向のtranslate値（INITIAL_TRANSLATEからの相対値） */
  x: number;
  /** Y方向のtranslate値（INITIAL_TRANSLATEからの相対値） */
  y: number;
  /** スケール値 */
  scale: number;
  /** 回転角度（度） */
  rotation: number;
  /** ドラッグ中かどうか */
  isDragging: boolean;
  /** ドラッグ開始時のX座標 */
  dragStartX: number;
  /** ドラッグ開始時のY座標 */
  dragStartY: number;
  /** ドラッグ開始時のstate.x */
  dragStartStateX: number;
  /** ドラッグ開始時のstate.y */
  dragStartStateY: number;
}

/**
 * クロップ領域の状態
 */
export interface CropAreaState {
  /** クロップ領域の幅（px） */
  width: number;
  /** クロップ領域の高さ（px） */
  height: number;
}

/**
 * 画像のサイズ情報
 */
export interface ImageSize {
  /** 画像の幅（px） */
  width: number;
  /** 画像の高さ（px） */
  height: number;
}

/**
 * Transform値
 */
export interface TransformValue {
  /** X方向のtranslate値 */
  x: number;
  /** Y方向のtranslate値 */
  y: number;
  /** スケール値 */
  scale?: number;
}

/**
 * 画像の向き
 */
export type ImageOrientation = 'vertical' | 'horizontal' | 'square';

/**
 * 画像タイプ情報
 */
export interface ImageTypeInfo {
  width: number;
  height: number;
  label: string;
}

/**
 * エッジ判定結果
 */
export interface EdgeDetection {
  /** 左端にいるかどうか */
  atLeftEdge: boolean;
  /** 右端にいるかどうか */
  atRightEdge: boolean;
  /** 上端にいるかどうか */
  atTopEdge: boolean;
  /** 下端にいるかどうか */
  atBottomEdge: boolean;
}

/**
 * 境界値
 */
export interface BoundaryValues {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
