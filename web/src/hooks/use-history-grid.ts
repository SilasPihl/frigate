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

  // two cameras trade places and sizes; a quick layout stays a quick layout
  const swapCameras = useCallback(
    (first: string, second: string) => {
      const a = layout.find((item) => item.i == first);
      const b = layout.find((item) => item.i == second);

      if (!a || !b || first == second) {
        return;
      }

      setStored({
        mode: "grid",
        preset: stored?.preset ?? null,
        layout: layout.map((item) =>
          item.i == first
            ? { ...b, i: first }
            : item.i == second
              ? { ...a, i: second }
              : item,
        ),
      });
    },
    [layout, setStored, stored?.preset],
  );

  return {
    loaded,
    mode,
    preset: mode == "grid" ? (stored?.preset ?? null) : null,
    layout,
    applyPreset,
    showSingle,
    saveLayout,
    swapCameras,
  };
}
