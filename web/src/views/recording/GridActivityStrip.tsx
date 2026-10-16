import { useCallback, useMemo, useRef } from "react";
import useSWR from "swr";
import { useTranslation } from "react-i18next";
import { LuChevronDown, LuChevronUp } from "react-icons/lu";
import { FrigateConfig } from "@/types/frigateConfig";
import { Recording } from "@/types/record";
import { MotionData, REVIEW_PADDING, ReviewSegment } from "@/types/review";
import { TimeRange } from "@/types/timeline";
import { cn } from "@/lib/utils";
import { use24HourTime } from "@/hooks/use-date-utils";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";

// recordings closer together than this count as one stretch
const RECORDING_GAP_SECONDS = 5;
// motion is fetched in buckets of this many seconds
const MOTION_SCALE = 30;
// a press that moves less than this is a click, not a drag
const DRAG_THRESHOLD_PX = 4;
const TICK_SECONDS = 5 * 60;
const LABEL_SECONDS = 15 * 60;

type GridActivityStripProps = {
  config?: FrigateConfig;
  timezone?: string;
  cameras: string[];
  mainCamera: string;
  timeRange: TimeRange;
  currentTime: number;
  reviewItems: ReviewSegment[];
  onSeek: (time: number, camera?: string) => void;
  onSelectCamera: (camera: string) => void;
  setScrubbing: (scrubbing: boolean) => void;
  setCurrentTime: (time: number) => void;
};

/**
 * One lane per grid camera under the History grid: when it recorded, how
 * much motion there was and its alerts and detections, with the playhead
 * across all of them. Click or drag to move every camera.
 */
export default function GridActivityStrip({
  config,
  timezone,
  cameras,
  mainCamera,
  timeRange,
  currentTime,
  reviewItems,
  onSeek,
  onSelectCamera,
  setScrubbing,
  setCurrentTime,
}: GridActivityStripProps) {
  const { t } = useTranslation(["views/events"]);
  const [expanded, setExpanded] = useUserPersistence<boolean>(
    "history-grid-activity",
    true,
  );
  const is24Hour = use24HourTime(config);

  const duration = Math.max(1, timeRange.before - timeRange.after);
  const toPercent = useCallback(
    (time: number) =>
      Math.min(100, Math.max(0, ((time - timeRange.after) / duration) * 100)),
    [timeRange.after, duration],
  );

  const ticks = useMemo(() => {
    const result: { time: number; label?: string }[] = [];
    const first = Math.ceil(timeRange.after / TICK_SECONDS) * TICK_SECONDS;

    for (let time = first; time <= timeRange.before; time += TICK_SECONDS) {
      result.push({
        time,
        label:
          time % LABEL_SECONDS == 0
            ? formatUnixTimestampToDateTime(time, {
                timezone,
                date_format: is24Hour ? "HH:mm" : "h:mm a",
              })
            : undefined,
      });
    }

    return result;
  }, [timeRange, timezone, is24Hour]);

  // clicking seeks, dragging scrubs like the timeline handle

  const tracksRef = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; dragging: boolean } | null>(null);

  const timeAt = useCallback(
    (clientX: number) => {
      const rect = tracksRef.current?.getBoundingClientRect();

      if (!rect || rect.width == 0) {
        return currentTime;
      }

      const fraction = Math.min(
        1,
        Math.max(0, (clientX - rect.left) / rect.width),
      );
      return timeRange.after + fraction * duration;
    },
    [currentTime, timeRange.after, duration],
  );

  if (!expanded) {
    return (
      <button
        type="button"
        className="flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-xs text-secondary-foreground hover:bg-secondary"
        onClick={() => setExpanded(true)}
      >
        <LuChevronUp className="size-3.5" />
        {t("grid.activity.show")}
      </button>
    );
  }

  return (
    <div className="flex shrink-0 flex-col gap-1 rounded-lg bg-secondary/40 p-2">
      <div className="flex gap-2">
        <div className="flex w-28 shrink-0 flex-col gap-1">
          {cameras.map((camera) => (
            <button
              key={camera}
              type="button"
              className={cn(
                "flex h-5 items-center gap-1.5 truncate rounded px-1 text-left text-xs hover:bg-secondary",
                camera == mainCamera
                  ? "font-medium text-primary"
                  : "text-secondary-foreground",
              )}
              title={t("grid.activity.makeMain")}
              onClick={() => onSelectCamera(camera)}
            >
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  camera == mainCamera ? "bg-selected" : "bg-transparent",
                )}
              />
              <CameraNameLabel
                camera={camera}
                className="cursor-pointer truncate smart-capitalize"
              />
            </button>
          ))}
        </div>
        <div
          ref={tracksRef}
          className="relative flex min-w-0 flex-1 cursor-pointer touch-none select-none flex-col gap-1"
          onPointerDown={(e) => {
            if (e.button != 0) {
              return;
            }

            e.currentTarget.setPointerCapture(e.pointerId);
            press.current = { x: e.clientX, dragging: false };
          }}
          onPointerMove={(e) => {
            if (!press.current) {
              return;
            }

            if (
              !press.current.dragging &&
              Math.abs(e.clientX - press.current.x) > DRAG_THRESHOLD_PX
            ) {
              press.current.dragging = true;
              setScrubbing(true);
            }

            if (press.current.dragging) {
              setCurrentTime(timeAt(e.clientX));
            }
          }}
          onPointerUp={(e) => {
            const wasDragging = press.current?.dragging;
            press.current = null;

            if (wasDragging) {
              setCurrentTime(timeAt(e.clientX));
              setScrubbing(false);
            } else {
              onSeek(timeAt(e.clientX));
            }
          }}
          onPointerCancel={() => {
            if (press.current?.dragging) {
              setScrubbing(false);
            }

            press.current = null;
          }}
        >
          {cameras.map((camera) => (
            <ActivityLane
              key={camera}
              camera={camera}
              timeRange={timeRange}
              toPercent={toPercent}
              reviewItems={reviewItems}
              onSeekReview={(review) =>
                onSeek(review.start_time - REVIEW_PADDING, review.camera)
              }
            />
          ))}
          {ticks.map((tick) => (
            <div
              key={tick.time}
              className={cn(
                "pointer-events-none absolute inset-y-0 w-px",
                tick.label
                  ? "bg-secondary-foreground/25"
                  : "bg-secondary-foreground/10",
              )}
              style={{ left: `${toPercent(tick.time)}%` }}
            />
          ))}
          <div
            className="pointer-events-none absolute -inset-y-1 w-0.5 rounded bg-selected"
            style={{ left: `${toPercent(currentTime)}%` }}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="flex w-28 shrink-0 items-center gap-1.5 rounded px-1 text-xs text-secondary-foreground hover:bg-secondary"
          onClick={() => setExpanded(false)}
        >
          <LuChevronDown className="size-3.5" />
          {t("grid.activity.hide")}
        </button>
        <div className="relative h-4 min-w-0 flex-1 text-[10px] text-secondary-foreground">
          {ticks
            .filter((tick) => tick.label)
            .map((tick) => (
              <div
                key={tick.time}
                className="absolute -translate-x-1/2 whitespace-nowrap"
                style={{ left: `${toPercent(tick.time)}%` }}
              >
                {tick.label}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

type ActivityLaneProps = {
  camera: string;
  timeRange: TimeRange;
  toPercent: (time: number) => number;
  reviewItems: ReviewSegment[];
  onSeekReview: (review: ReviewSegment) => void;
};
function ActivityLane({
  camera,
  timeRange,
  toPercent,
  reviewItems,
  onSeekReview,
}: ActivityLaneProps) {
  // the same request the camera's player makes, so it comes from the cache
  const recordingParams = useMemo(
    () => ({ before: timeRange.before, after: timeRange.after }),
    [timeRange],
  );
  const { data: recordings } = useSWR<Recording[]>(
    [`${camera}/recordings`, recordingParams],
    { revalidateOnFocus: false },
  );
  const { data: motion } = useSWR<MotionData[]>(
    [
      "review/activity/motion",
      { ...recordingParams, scale: MOTION_SCALE, cameras: camera },
    ],
    { revalidateOnFocus: false },
  );

  const recorded = useMemo(() => {
    const stretches: { start: number; end: number }[] = [];

    [...(recordings ?? [])]
      .sort((a, b) => a.start_time - b.start_time)
      .forEach((segment) => {
        const last = stretches[stretches.length - 1];

        if (last && segment.start_time - last.end <= RECORDING_GAP_SECONDS) {
          last.end = Math.max(last.end, segment.end_time);
        } else {
          stretches.push({ start: segment.start_time, end: segment.end_time });
        }
      });

    return stretches;
  }, [recordings]);

  const motionBars = useMemo(() => {
    const values = (motion ?? []).filter((m) => (m.motion ?? 0) > 0);
    const max = Math.max(1, ...values.map((m) => m.motion ?? 0));

    return values.map((m) => ({
      left: toPercent(m.start_time),
      width: Math.max(
        0.15,
        toPercent(m.start_time + MOTION_SCALE) - toPercent(m.start_time),
      ),
      height: Math.max(15, ((m.motion ?? 0) / max) * 100),
    }));
  }, [motion, toPercent]);

  const reviews = useMemo(
    () =>
      reviewItems.filter(
        (review) =>
          review.camera == camera &&
          review.severity != "significant_motion" &&
          (review.end_time ?? timeRange.before) >= timeRange.after &&
          review.start_time <= timeRange.before,
      ),
    [reviewItems, camera, timeRange],
  );

  return (
    <div
      className="relative h-5 overflow-hidden rounded-sm bg-background"
      style={{
        backgroundImage:
          "repeating-linear-gradient(135deg, transparent 0 4px, hsl(var(--secondary-foreground) / 0.12) 4px 5px)",
      }}
    >
      {recorded.map((stretch) => (
        <div
          key={stretch.start}
          className="absolute inset-y-0 bg-secondary"
          style={{
            left: `${toPercent(stretch.start)}%`,
            width: `${toPercent(stretch.end) - toPercent(stretch.start)}%`,
          }}
        />
      ))}
      {motionBars.map((bar) => (
        <div
          key={bar.left}
          className="absolute bottom-0 bg-secondary-foreground/30"
          style={{
            left: `${bar.left}%`,
            width: `${bar.width}%`,
            height: `${bar.height}%`,
          }}
        />
      ))}
      {reviews.map((review) => (
        <div
          key={review.id}
          className={cn(
            "absolute inset-y-0.5 min-w-[3px] rounded-sm hover:brightness-125",
            review.severity == "alert"
              ? "bg-severity_alert"
              : "bg-severity_detection",
          )}
          style={{
            left: `${toPercent(review.start_time)}%`,
            width: `${
              toPercent(review.end_time ?? timeRange.before) -
              toPercent(review.start_time)
            }%`,
          }}
          title={[...review.data.objects, ...review.data.audio].join(", ")}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onSeekReview(review);
          }}
        />
      ))}
    </div>
  );
}
