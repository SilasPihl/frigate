import { Layout, LayoutItem } from "react-grid-layout";

// shared by the Live dashboard and the History grid

export const CAMERA_GRID_COLUMNS = 12;

/**
 * react-grid-layout onResize handler that keeps a camera tile's aspect
 * ratio while it is dragged by a corner.
 */
export function keepAspectOnResize(
  _layout: Layout,
  oldLayoutItem: LayoutItem | null,
  layoutItem: LayoutItem | null,
  placeholder: LayoutItem | null,
) {
  if (!oldLayoutItem || !layoutItem || !placeholder) return;

  const heightDiff = layoutItem.h - oldLayoutItem.h;
  const widthDiff = layoutItem.w - oldLayoutItem.w;
  const changeCoef = oldLayoutItem.w / oldLayoutItem.h;

  let newWidth, newHeight;

  if (Math.abs(heightDiff) < Math.abs(widthDiff)) {
    newHeight = Math.round(layoutItem.w / changeCoef);
    newWidth = Math.round(newHeight * changeCoef);
  } else {
    newWidth = Math.round(layoutItem.h * changeCoef);
    newHeight = Math.round(newWidth / changeCoef);
  }

  // Ensure dimensions maintain aspect ratio and fit within the grid
  if (layoutItem.x + newWidth > CAMERA_GRID_COLUMNS) {
    newWidth = CAMERA_GRID_COLUMNS - layoutItem.x;
    newHeight = Math.round(newWidth / changeCoef);
  }

  if (changeCoef == 0.5) {
    // portrait
    newHeight = Math.ceil(newHeight / 2) * 2;
  } else if (changeCoef == 2) {
    // pano/wide
    newHeight = Math.ceil(newHeight * 2) / 2;
  }

  newWidth = Math.round(newHeight * changeCoef);

  layoutItem.w = newWidth;
  layoutItem.h = newHeight;
  placeholder.w = layoutItem.w;
  placeholder.h = layoutItem.h;
}

// cameras that are not in the big part of a preset get this size, in grid units
const SMALL_TILE = 2;

export type HistoryGridPreset = "2x2" | "3x2" | "2x3";

export const HISTORY_GRID_PRESETS: {
  id: HistoryGridPreset;
  columns: number;
  rows: number;
}[] = [
  { id: "2x2", columns: 2, rows: 2 },
  { id: "3x2", columns: 3, rows: 2 },
  { id: "2x3", columns: 2, rows: 3 },
];

export type GridItem = Pick<LayoutItem, "i" | "x" | "y" | "w" | "h">;

export function bottomOf(layout: GridItem[]) {
  return layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
}

// cameras below the big ones, centered, as many per row as fit
export function smallRow(cameras: string[], top: number): GridItem[] {
  const perRow = CAMERA_GRID_COLUMNS / SMALL_TILE;

  return cameras.map((camera, index) => {
    const row = Math.floor(index / perRow);
    const inRow = Math.min(perRow, cameras.length - row * perRow);
    const offset = (CAMERA_GRID_COLUMNS - inRow * SMALL_TILE) / 2;

    return {
      i: camera,
      x: offset + (index % perRow) * SMALL_TILE,
      y: top + row * SMALL_TILE,
      w: SMALL_TILE,
      h: SMALL_TILE,
    };
  });
}

export function presetLayout(
  preset: HistoryGridPreset,
  cameras: string[],
): GridItem[] {
  const { columns, rows } =
    HISTORY_GRID_PRESETS.find((p) => p.id == preset) ?? HISTORY_GRID_PRESETS[0];
  const size = CAMERA_GRID_COLUMNS / columns;
  const big = cameras.slice(0, columns * rows);
  const layout = big.map((camera, index) => ({
    i: camera,
    x: (index % columns) * size,
    y: Math.floor(index / columns) * size,
    w: size,
    h: size,
  }));

  return layout.concat(
    smallRow(cameras.slice(big.length), Math.ceil(big.length / columns) * size),
  );
}

// keep a saved layout in step with the selected cameras, as Live does
export function reconcileLayout(
  layout: GridItem[],
  cameras: string[],
): GridItem[] {
  const kept = layout.filter((item) => cameras.includes(item.i));
  const missing = cameras.filter(
    (camera) => !kept.some((item) => item.i == camera),
  );

  return kept.concat(smallRow(missing, bottomOf(kept)));
}

export function layoutOrder(layout: GridItem[]): string[] {
  return [...layout]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((item) => item.i);
}
