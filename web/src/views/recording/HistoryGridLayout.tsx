import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { GridLayout, Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useTranslation } from "react-i18next";
import {
  LuCheck,
  LuKeyboard,
  LuLayoutDashboard,
  LuMaximize2,
  LuMinimize2,
  LuMove,
  LuVolume2,
  LuVolumeX,
} from "react-icons/lu";
import { useResizeObserver } from "@/hooks/resize-observer";
import { cn } from "@/lib/utils";
import CornerCircles from "@/components/grid/CornerCircles";
import {
  CAMERA_GRID_COLUMNS,
  GridItem,
  HISTORY_GRID_PRESETS,
  HistoryGridPreset,
  bottomOf,
  keepAspectOnResize,
  layoutOrder,
  smallRow,
} from "@/utils/cameraGridUtil";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// gap between tiles, in px
const GRID_MARGIN = 8;
// drag-and-drop type for swapping two cameras
const CAMERA_DRAG_TYPE = "application/x-frigate-camera";

function PresetIcon({ columns, rows }: { columns: number; rows: number }) {
  const width = 18;
  const bigHeight = 10.5;
  const gap = 1.5;
  const cellWidth = (width - gap * (columns - 1)) / columns;
  const cellHeight = (bigHeight - gap * (rows - 1)) / rows;
  const cells = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      cells.push(
        <rect
          key={`${x}-${y}`}
          x={x * (cellWidth + gap)}
          y={y * (cellHeight + gap)}
          width={cellWidth}
          height={cellHeight}
          rx={1}
        />,
      );
    }
  }

  for (let k = 0; k < 4; k++) {
    cells.push(
      <rect
        key={`small-${k}`}
        x={1 + k * 4.2}
        y={bigHeight + 1.2}
        width={3.4}
        height={14 - bigHeight - 1.2}
        rx={0.6}
        opacity={0.55}
      />,
    );
  }

  return (
    <svg viewBox="0 0 18 14" className="h-3.5 w-[18px]" fill="currentColor">
      {cells}
    </svg>
  );
}

type HistoryLayoutPickerProps = {
  mode: "single" | "grid";
  preset: HistoryGridPreset | null;
  isEditMode: boolean;
  setIsEditMode: (editing: boolean) => void;
  onSelectSingle: () => void;
  onSelectPreset: (preset: HistoryGridPreset) => void;
};
export function HistoryLayoutPicker({
  mode,
  preset,
  isEditMode,
  setIsEditMode,
  onSelectSingle,
  onSelectPreset,
}: HistoryLayoutPickerProps) {
  const { t } = useTranslation(["views/events", "views/live"]);
  const value = mode == "single" ? "single" : (preset ?? "");

  return (
    <div className="flex items-center gap-1">
      <ToggleGroup
        className="*:rounded-md *:px-2.5 *:py-4"
        type="single"
        size="sm"
        value={value}
        aria-label={t("grid.layout")}
        onValueChange={(newValue: string) => {
          if (!newValue) {
            return;
          }

          if (newValue == "single") {
            onSelectSingle();
          } else {
            onSelectPreset(newValue as HistoryGridPreset);
          }
        }}
      >
        <ToggleGroupItem
          className={cn(value != "single" && "text-muted-foreground")}
          value="single"
          aria-label={t("grid.single")}
          title={`${t("grid.single")} (1)`}
        >
          <svg
            viewBox="0 0 18 14"
            className="h-3.5 w-[18px]"
            fill="currentColor"
          >
            <rect x={0} y={0} width={18} height={10.5} rx={1} />
            {[0, 1, 2, 3].map((k) => (
              <rect
                key={k}
                x={1 + k * 4.2}
                y={11.7}
                width={3.4}
                height={2.3}
                rx={0.6}
                opacity={0.55}
              />
            ))}
          </svg>
          <span className="ml-1.5">1</span>
        </ToggleGroupItem>
        {HISTORY_GRID_PRESETS.map((p, index) => (
          <ToggleGroupItem
            key={p.id}
            className={cn(value != p.id && "text-muted-foreground")}
            value={p.id}
            aria-label={t("grid.preset", { columns: p.columns, rows: p.rows })}
            title={`${t("grid.preset", { columns: p.columns, rows: p.rows })} (${index + 2})`}
          >
            <PresetIcon columns={p.columns} rows={p.rows} />
            <span className="ml-1.5">
              {p.columns}×{p.rows}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {mode == "grid" && preset == null && (
        <div className="rounded-md bg-secondary px-2.5 py-1.5 text-sm text-primary">
          {t("grid.custom")}
        </div>
      )}
      {mode == "grid" && (
        <Button
          className="flex items-center gap-2 rounded-lg"
          size="sm"
          variant={isEditMode ? "select" : "default"}
          aria-pressed={isEditMode}
          title={t("grid.editShortcut")}
          onClick={() => setIsEditMode(!isEditMode)}
        >
          {isEditMode ? (
            <LuCheck className="size-4" />
          ) : (
            <LuLayoutDashboard className="size-4" />
          )}
          {isEditMode
            ? t("grid.doneEditing")
            : t("editLayout.label", { ns: "views/live" })}
        </Button>
      )}
      <HistoryShortcuts />
    </div>
  );
}

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Space"], label: "playPause" },
  { keys: ["←", "→"], label: "seek10" },
  { keys: ["Shift", "←", "→"], label: "seek60" },
  { keys: ["↑", "↓"], label: "seek1" },
  { keys: ["M"], label: "mute" },
  { keys: ["F"], label: "fullscreen" },
  { keys: ["1"], label: "single" },
  { keys: ["2", "3", "4"], label: "presets" },
  { keys: ["E"], label: "edit" },
  { keys: ["Esc"], label: "escape" },
];

function HistoryShortcuts() {
  const { t } = useTranslation(["views/events"]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="rounded-lg"
          size="sm"
          aria-label={t("grid.shortcuts.title")}
          title={t("grid.shortcuts.title")}
        >
          <LuKeyboard className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="mb-2 text-sm font-medium text-primary">
          {t("grid.shortcuts.title")}
        </div>
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 text-sm">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.label} className="contents">
              <div className="flex gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="rounded border border-secondary-highlight bg-secondary px-1.5 py-0.5 font-mono text-xs text-primary"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
              <div className="text-secondary-foreground">
                {t(`grid.shortcuts.${shortcut.label}`)}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type HistoryGridLayoutProps = {
  layout: GridItem[];
  mainCamera: string;
  enlargedCamera?: string;
  isEditMode: boolean;
  setIsEditMode: (editing: boolean) => void;
  onSaveLayout: (layout: Layout) => void;
  onSelectCamera: (camera: string) => void;
  onEnlargeCamera: (camera: string | undefined) => void;
  onSwapCameras: (first: string, second: string) => void;
  audibleCameras: string[];
  onToggleAudio: (camera: string) => void;
  renderCamera: (camera: string, isMain: boolean) => ReactNode;
};
export default function HistoryGridLayout({
  layout,
  mainCamera,
  enlargedCamera,
  isEditMode,
  setIsEditMode,
  onSaveLayout,
  onSelectCamera,
  onEnlargeCamera,
  onSwapCameras,
  audibleCameras,
  onToggleAudio,
  renderCamera,
}: HistoryGridLayoutProps) {
  const { t } = useTranslation(["views/events"]);

  // swapping by drag-and-drop works without edit mode
  const [draggedCamera, setDraggedCamera] = useState<string>();
  const [dropCamera, setDropCamera] = useState<string>();

  // while a camera is enlarged it fills the width, the others sit small below
  const shownLayout = useMemo(() => {
    if (!enlargedCamera) {
      return layout;
    }

    const others = layoutOrder(layout).filter(
      (camera) => camera != enlargedCamera,
    );

    return [
      {
        i: enlargedCamera,
        x: 0,
        y: 0,
        w: CAMERA_GRID_COLUMNS,
        h: CAMERA_GRID_COLUMNS,
      },
      ...smallRow(others, CAMERA_GRID_COLUMNS),
    ];
  }, [layout, enlargedCamera]);

  // the grid has to fit above the controls, so it scales to the height
  // instead of scrolling like Live

  const containerRef = useRef<HTMLDivElement>(null);
  const [{ width: containerWidth, height: containerHeight }] =
    useResizeObserver(containerRef);

  const { gridWidth, rowHeight } = useMemo(() => {
    const rows = Math.max(1, bottomOf(shownLayout));
    const unitFromWidth = (containerWidth + GRID_MARGIN) / CAMERA_GRID_COLUMNS;
    const unitFromHeight = ((containerHeight + GRID_MARGIN) * 16) / (9 * rows);
    const unit = Math.max(1, Math.min(unitFromWidth, unitFromHeight));

    return {
      gridWidth: CAMERA_GRID_COLUMNS * unit - GRID_MARGIN,
      rowHeight: Math.max(1, (unit * 9) / 16 - GRID_MARGIN),
    };
  }, [shownLayout, containerWidth, containerHeight]);

  useEffect(() => {
    if (!enlargedCamera && !isEditMode) {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key != "Escape") {
        return;
      }

      if (isEditMode) {
        setIsEditMode(false);
      } else {
        onEnlargeCamera(undefined);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enlargedCamera, isEditMode, onEnlargeCamera, setIsEditMode]);

  const editing = isEditMode && !enlargedCamera;

  return (
    <div ref={containerRef} className="relative size-full overflow-hidden">
      {containerWidth > 0 && containerHeight > 0 && (
        <div className="mx-auto" style={{ width: gridWidth }}>
          <GridLayout
            width={gridWidth}
            layout={shownLayout}
            gridConfig={{
              cols: CAMERA_GRID_COLUMNS,
              rowHeight,
              margin: [GRID_MARGIN, GRID_MARGIN],
              containerPadding: [0, 0],
            }}
            dragConfig={{ enabled: editing }}
            resizeConfig={{
              enabled: editing,
              handles: editing ? ["sw", "nw", "se", "ne"] : [],
            }}
            onResize={keepAspectOnResize}
            onDragStop={(newLayout) => onSaveLayout(newLayout)}
            onResizeStop={(newLayout) => onSaveLayout(newLayout)}
          >
            {shownLayout.map(({ i: camera }) => {
              const isMain = camera == mainCamera;
              const isEnlarged = camera == enlargedCamera;

              const canSwap = !editing && !enlargedCamera;

              return (
                <div key={camera} className="group">
                  <div
                    className={cn(
                      "relative size-full overflow-hidden rounded-lg bg-black md:rounded-2xl",
                      isMain &&
                        !editing &&
                        "outline outline-2 outline-selected",
                      editing &&
                        "outline outline-2 outline-muted-foreground hover:cursor-grab hover:outline-4 active:cursor-grabbing",
                      draggedCamera == camera && "opacity-50",
                      dropCamera == camera &&
                        draggedCamera != camera &&
                        "outline-dashed outline-4 outline-selected",
                    )}
                    onClick={() => {
                      if (!editing && !isMain) {
                        onSelectCamera(camera);
                      }
                    }}
                    onDragOver={(e) => {
                      if (
                        canSwap &&
                        e.dataTransfer.types.includes(CAMERA_DRAG_TYPE)
                      ) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setDropCamera(camera);
                      }
                    }}
                    onDragLeave={() =>
                      setDropCamera((current) =>
                        current == camera ? undefined : current,
                      )
                    }
                    onDrop={(e) => {
                      const source = e.dataTransfer.getData(CAMERA_DRAG_TYPE);
                      e.preventDefault();
                      setDropCamera(undefined);
                      setDraggedCamera(undefined);

                      if (source && source != camera) {
                        onSwapCameras(source, camera);
                      }
                    }}
                  >
                    {renderCamera(camera, isMain)}
                    <CameraNameLabel
                      camera={camera}
                      className="pointer-events-none absolute bottom-2 left-2 z-30 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white smart-capitalize"
                    />
                    {!isMain && !editing && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "absolute right-20 top-2 z-30 rounded-md bg-black/60 p-1.5 text-white transition-opacity focus:opacity-100",
                              audibleCameras.includes(camera)
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100",
                            )}
                            aria-pressed={audibleCameras.includes(camera)}
                            aria-label={
                              audibleCameras.includes(camera)
                                ? t("grid.mute")
                                : t("grid.unmute")
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleAudio(camera);
                            }}
                          >
                            {audibleCameras.includes(camera) ? (
                              <LuVolume2 className="size-4" />
                            ) : (
                              <LuVolumeX className="size-4" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {audibleCameras.includes(camera)
                            ? t("grid.mute")
                            : t("grid.unmute")}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {canSwap && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            draggable
                            role="button"
                            tabIndex={-1}
                            className="absolute right-11 top-2 z-30 cursor-grab rounded-md bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
                            aria-label={t("grid.swap")}
                            onClick={(e) => e.stopPropagation()}
                            onDragStart={(e) => {
                              e.dataTransfer.setData(CAMERA_DRAG_TYPE, camera);
                              e.dataTransfer.effectAllowed = "move";
                              const tile =
                                e.currentTarget.closest(".react-grid-item");

                              if (tile) {
                                e.dataTransfer.setDragImage(tile, 40, 30);
                              }

                              setDraggedCamera(camera);
                            }}
                            onDragEnd={() => {
                              setDraggedCamera(undefined);
                              setDropCamera(undefined);
                            }}
                          >
                            <LuMove className="size-4" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>{t("grid.swap")}</TooltipContent>
                      </Tooltip>
                    )}
                    {!editing && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="absolute right-2 top-2 z-30 rounded-md bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                            aria-label={
                              isEnlarged
                                ? t("grid.backToGrid")
                                : t("grid.enlarge")
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              onEnlargeCamera(isEnlarged ? undefined : camera);
                            }}
                          >
                            {isEnlarged ? (
                              <LuMinimize2 className="size-4" />
                            ) : (
                              <LuMaximize2 className="size-4" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isEnlarged
                            ? t("grid.backToGrid")
                            : t("grid.enlarge")}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {editing && <div className="absolute inset-0 z-40" />}
                  </div>
                  {editing && <CornerCircles />}
                </div>
              );
            })}
          </GridLayout>
        </div>
      )}
      {editing && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-50 -translate-x-1/2 rounded-lg bg-secondary/90 px-3 py-1.5 text-sm text-primary shadow">
          {t("grid.editHint")}
        </div>
      )}
    </div>
  );
}
