import { X } from "lucide-react";
import type { UserTag } from "../types";

interface Props {
  tag: UserTag;
  isExcessOdai: boolean;
  onRemove: (id: string) => void;
}

export default function TagChip({ tag, isExcessOdai, onRemove }: Props) {
  const display = tag.raw.startsWith("#") ? tag.raw : `#${tag.raw}`;

  if (!tag.isOdai) {
    return (
      <span className="inline-flex items-center gap-0.5 pl-2.5 pr-1 py-1 rounded-full text-sm bg-gray-100 text-gray-600 border border-gray-200">
        <span>{display}</span>
        <button
          onClick={() => onRemove(tag.id)}
          className="ml-1 p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
          aria-label={`${display}を削除`}
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    );
  }

  const colors = isExcessOdai
    ? "bg-red-50 text-red-700 border-red-300"
    : "bg-teal-50 text-teal-700 border-teal-300";
  const badgeColors = isExcessOdai
    ? "bg-red-100 text-red-500"
    : "bg-teal-100 text-teal-600";
  const closeColors = isExcessOdai
    ? "text-red-400 hover:bg-red-100"
    : "text-teal-400 hover:bg-teal-100";

  return (
    <span
      className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-sm border font-medium ${colors}`}
    >
      <span>{display}</span>
      <span className={`text-xs px-1.5 py-0 rounded-full leading-5 ${badgeColors}`}>
        お題
      </span>
      <button
        onClick={() => onRemove(tag.id)}
        className={`ml-0.5 p-0.5 rounded-full transition-colors ${closeColors}`}
        aria-label={`${display}を削除`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
