import type { Editor, TLShapeId } from "@/components/TldrawAnnotation";
import type { Capture } from "@/lib/types";

interface UseAnnotationActionsArgs {
  editor: Editor | null;
  imageShapeId: TLShapeId | null;
  captureId: string;
  updateCapture: (id: string, patch: Partial<Capture>) => void;
}

interface UseAnnotationActionsReturn {
  /** Serialize tldraw annotations into an image and persist via updateCapture. */
  handleSave: (notes: string, onClose: () => void) => Promise<void>;
  /** Remove all annotation shapes, keeping only the background image. */
  handleClear: () => void;
}

export function useAnnotationActions({
  editor,
  imageShapeId,
  captureId,
  updateCapture,
}: UseAnnotationActionsArgs): UseAnnotationActionsReturn {
  const handleSave = async (notes: string, onClose: () => void) => {
    if (!editor || !imageShapeId) {
      updateCapture(captureId, { notes });
      onClose();
      return;
    }

    // Export all shapes on the page (includes background image + annotations)
    const allShapeIds = [...editor.getCurrentPageShapeIds()];
    try {
      const { blob } = await editor.toImage(allShapeIds, { format: "png" });
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      updateCapture(captureId, {
        annotatedScreenshotBase64: dataUrl,
        notes,
      });
    } catch {
      updateCapture(captureId, { notes });
    }
    onClose();
  };

  const handleClear = () => {
    if (!editor || !imageShapeId) return;
    const allIds = [...editor.getCurrentPageShapeIds()];
    const toDelete = allIds.filter((id) => id !== imageShapeId);
    if (toDelete.length > 0) editor.deleteShapes(toDelete);
  };

  return { handleSave, handleClear };
}
