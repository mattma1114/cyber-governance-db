import { useState, useEffect, useCallback } from "react";
import { X, Download, ExternalLink, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PreviewFile {
  id: number;
  filename: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSize?: number | null;
}

interface FilePreviewModalProps {
  files: PreviewFile[];
  initialIndex: number;
  onClose: () => void;
}

function isPdf(file: PreviewFile) {
  return (
    file.mimeType?.includes("pdf") ||
    file.filename.toLowerCase().endsWith(".pdf")
  );
}

function isImage(file: PreviewFile) {
  return (
    file.mimeType?.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(file.filename)
  );
}

export function canPreview(file: PreviewFile) {
  return isPdf(file) || isImage(file);
}

export function FilePreviewModal({ files, initialIndex, onClose }: FilePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imgZoom, setImgZoom] = useState(1);
  const [imgRotation, setImgRotation] = useState(0);

  const current = files[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  const goNext = useCallback(() => {
    if (hasNext) { setCurrentIndex(i => i + 1); setImgZoom(1); setImgRotation(0); }
  }, [hasNext]);

  const goPrev = useCallback(() => {
    if (hasPrev) { setCurrentIndex(i => i - 1); setImgZoom(1); setImgRotation(0); }
  }, [hasPrev]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!current) return null;

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {files.length > 1 && (
            <span className="text-xs text-white/50 shrink-0">
              {currentIndex + 1} / {files.length}
            </span>
          )}
          <span className="text-sm font-medium text-white truncate">{current.filename}</span>
          {current.fileSize && (
            <span className="text-xs text-white/40 shrink-0">{formatSize(current.fileSize)}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-4">
          {/* Image controls */}
          {isImage(current) && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setImgZoom(z => Math.max(0.25, z - 0.25))}
                title="缩小"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs text-white/50 w-10 text-center">{Math.round(imgZoom * 100)}%</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setImgZoom(z => Math.min(4, z + 0.25))}
                title="放大"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setImgRotation(r => (r + 90) % 360)}
                title="旋转"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          <a
            href={current.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-7 w-7 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="在新标签页打开"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href={current.fileUrl}
            download={current.filename}
            className="inline-flex items-center justify-center h-7 w-7 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="下载文件"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
            onClick={onClose}
            title="关闭 (Esc)"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {/* Prev/Next buttons */}
        {hasPrev && (
          <button
            className="absolute left-3 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-black/50 text-white/80 hover:bg-black/80 hover:text-white transition-colors"
            onClick={goPrev}
            title="上一个 (←)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {hasNext && (
          <button
            className="absolute right-3 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-black/50 text-white/80 hover:bg-black/80 hover:text-white transition-colors"
            onClick={goNext}
            title="下一个 (→)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* PDF Preview */}
        {isPdf(current) && (
          <iframe
            key={current.id}
            src={`${current.fileUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
            className="w-full h-full border-0"
            title={current.filename}
          />
        )}

        {/* Image Preview */}
        {isImage(current) && (
          <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
            <img
              key={current.id}
              src={current.fileUrl}
              alt={current.filename}
              className="max-w-none object-contain transition-transform duration-200 cursor-zoom-in select-none"
              style={{
                transform: `scale(${imgZoom}) rotate(${imgRotation}deg)`,
                maxWidth: imgZoom <= 1 ? "100%" : "none",
                maxHeight: imgZoom <= 1 ? "100%" : "none",
              }}
              onClick={() => setImgZoom(z => z >= 2 ? 1 : z + 0.5)}
              draggable={false}
            />
          </div>
        )}
      </div>

      {/* ── Thumbnail strip (when multiple files) ── */}
      {files.length > 1 && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-black/60 border-t border-white/10 overflow-x-auto">
          {files.map((f, i) => (
            <button
              key={f.id}
              onClick={() => { setCurrentIndex(i); setImgZoom(1); setImgRotation(0); }}
              className={`shrink-0 text-xs px-2.5 py-1 rounded transition-colors ${
                i === currentIndex
                  ? "bg-primary text-primary-foreground"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {f.filename.length > 20 ? f.filename.slice(0, 18) + "…" : f.filename}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
