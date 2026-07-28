"use client";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmRemoveModal({
  open,
  title,
  description,
  confirmText = "빼기",
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-zinc-800">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">{description}</p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-700"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
