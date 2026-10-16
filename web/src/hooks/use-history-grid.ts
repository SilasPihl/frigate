import { useCallback, useMemo } from "react";
import { Layout } from "react-grid-layout";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import {
  GridItem,
  HistoryGridPreset,
  layoutOrder,
  presetLayout,
  reconcileLayout,
} from "@/utils/cameraGridUtil";

export type HistoryGridState = {
  mode: "single" | "grid";
  preset: HistoryGridPreset | null;
  layout: GridItem[];
};

/**
 * Which History layout is chosen and where each camera sits in the grid.
 * Saved per user, like the Live dashboard's layouts.
 */
export function useHistoryGrid(cameras: string[]) {
  const [stored, setStored, loaded] = useUserPersistence<HistoryGridState>(
    "history-grid-layout",
  );

  const layout = useMemo(
    () => reconcileLayout(stored?.layout ?? [], cameras),
    [stored, cameras],
  );

  const mode: HistoryGridState["mode"] =
    loaded && stored?.mode == "grid" && cameras.length > 1 ? "grid" : "single";

  const applyPreset = useCallback(
    (preset: HistoryGridPreset, firstCamera?: string) => {
      const order =
        mode == "grid"
          ? layoutOrder(layout)
          : [
              ...(firstCamera ? [firstCamera] : []),
              ...cameras.filter((camera) => camera != firstCamera),
            ];

      setStored({
        mode: "grid",
        preset,
        layout: presetLayout(preset, order),
      });
    },
    [cameras, layout, mode, setStored],
  );

  const showSingle = useCallback(() => {
    setStored({
      mode: "single",
      preset: stored?.preset ?? null,
      layout: stored?.layout ?? [],
    });
  }, [setStored, stored]);

  const saveLayout = useCallback(
    (newLayout: Layout) => {
      setStored({
        mode: "grid",
        preset: null,
        layout: newLayout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })),
      });
    },
    [setStored],
  );

  return {
    loaded,
    mode,
    preset: mode == "grid" ? (stored?.preset ?? null) : null,
    layout,
    applyPreset,
    showSingle,
    saveLayout,
  };
}
