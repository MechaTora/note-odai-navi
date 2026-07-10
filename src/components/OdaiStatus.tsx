import { AlertCircle, CheckCircle2, Hash, Info } from "lucide-react";
import type { UserTag } from "../types";

interface Props {
  count: number;
  isOverLimit: boolean;
  odaiTags: UserTag[];
  onRemove: (id: string) => void;
}

const MAX = 2;

export default function OdaiStatus({ count, isOverLimit, odaiTags, onRemove }: Props) {
  const excessCount = Math.max(0, count - MAX);

  const stateColor = isOverLimit
    ? { bg: "bg-red-50", border: "border-red-200", text: "text-red-600", bar: "bg-red-400", sub: "text-red-500" }
    : count === MAX
    ? { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", bar: "bg-teal-400", sub: "text-teal-600" }
    : { bg: "bg-white", border: "border-gray-200", text: "text-gray-700", bar: "bg-teal-400", sub: "text-gray-500" };

  const StatusIcon = isOverLimit ? AlertCircle : count === MAX ? CheckCircle2 : Info;
  const iconColor = isOverLimit ? "text-red-500" : count === MAX ? "text-teal-500" : "text-gray-400";

  const message =
    count === 0
      ? "タグを入力すると、お題タグを自動で判定します"
      : isOverLimit
      ? `お題タグが上限を超えています。あと ${excessCount} つ削除が必要です。`
      : count === MAX
      ? "上限の 2 つに達しています。新たに追加するにはいずれかを削除してください。"
      : `あと ${MAX - count} つお題タグを追加できます。`;

  return (
    <div className={`rounded-2xl p-5 border transition-all duration-300 ${stateColor.bg} ${stateColor.border}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            お題タグの使用状況
          </p>

          {/* Slot bars */}
          <div className="flex items-center gap-1.5 mb-3">
            {Array.from({ length: MAX }).map((_, i) => (
              <div
                key={i}
                className={`h-2.5 w-16 rounded-full transition-all duration-300 ${
                  i < count ? stateColor.bar : "bg-gray-200"
                }`}
              />
            ))}
            {isOverLimit &&
              Array.from({ length: excessCount }).map((_, i) => (
                <div key={`x${i}`} className="h-2.5 w-16 rounded-full bg-red-300" />
              ))}
          </div>

          <p className={`text-sm leading-relaxed ${stateColor.sub}`}>{message}</p>
        </div>

        {/* Counter badge */}
        <div className={`flex flex-col items-center gap-1 shrink-0`}>
          <StatusIcon className={`w-5 h-5 ${iconColor}`} />
          <span className={`text-2xl font-bold leading-none ${stateColor.text}`}>{count}</span>
          <span className="text-xs text-gray-400">/ {MAX}</span>
        </div>
      </div>

      {/* Over-limit: お題 tag removal suggestions */}
      {isOverLimit && odaiTags.length > 0 && (
        <div className="mt-4 pt-4 border-t border-red-200">
          <p className="text-xs font-medium text-red-500 mb-2">
            以下のお題タグから {excessCount} つを削除してください
          </p>
          <div className="flex flex-wrap gap-2">
            {odaiTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => onRemove(tag.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-300 text-red-600 text-xs font-medium rounded-full hover:bg-red-100 transition-colors"
              >
                <Hash className="w-3 h-3" />
                <span>{tag.normalized}</span>
                <span className="text-red-400 font-bold">×</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
