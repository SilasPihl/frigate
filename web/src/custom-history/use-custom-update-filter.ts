import { useCallback } from "react";
import { ReviewFilter } from "@/types/review";
import { RecordingStartingPoint } from "@/types/record";
import { RecordingPosition } from "@/custom-history/types";

// History (custom)'s filter handler for Events: a new date starts at that
// date; any other filter change keeps the camera and time being watched
// (Frigate's own History jumps back to the start of the range instead)
export function useCustomUpdateFilter(
  recording: RecordingStartingPoint | undefined,
  reviewFilter: ReviewFilter | undefined,
  setRecording: (value: RecordingStartingPoint, replace?: boolean) => void,
  setReviewFilter: (value: ReviewFilter) => void,
) {
  return useCallback(
    (newFilter: ReviewFilter, position?: RecordingPosition) => {
      setReviewFilter(newFilter);

      if (recording == undefined) {
        return;
      }

      const newAfter = newFilter.after;
      const dateChanged =
        newAfter != undefined &&
        (newAfter != reviewFilter?.after ||
          newFilter.before != reviewFilter?.before);

      if (dateChanged) {
        setRecording({ ...recording, startTime: newAfter }, true);
      } else if (position) {
        setRecording(
          { ...recording, camera: position.camera, startTime: position.time },
          true,
        );
      }
    },
    [recording, reviewFilter, setRecording, setReviewFilter],
  );
}
