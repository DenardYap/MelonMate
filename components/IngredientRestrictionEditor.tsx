"use client";

import { useId, useMemo, useState } from "react";
import { BUILTIN_FOODS } from "@/lib/foods";
import { buildRestrictionOptions, normalizeRestriction, searchRestrictionOptions } from "@/lib/ingredientRestrictions";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";
import { AppIcon } from "./icons";

export function IngredientRestrictionEditor({
  value,
  onChange,
  lang,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  lang: Lang;
}) {
  const recipes = useStore((state) => state.recipes);
  const customFoods = useStore((state) => state.customFoods);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const listId = useId();
  const options = useMemo(
    () => buildRestrictionOptions([...customFoods, ...BUILTIN_FOODS], recipes),
    [customFoods, recipes]
  );
  const matches = useMemo(() => searchRestrictionOptions(options, query), [options, query]);

  const add = (label?: string) => {
    const typed = query.trim();
    const exact = matches.find((option) =>
      [option.label.en, option.label.zh, ...(option.aliases ?? [])]
        .some((candidate) => normalizeRestriction(candidate) === normalizeRestriction(typed))
    );
    const nextValue = label ?? (exact ? exact.label[lang] : typed);
    if (!nextValue) return;
    if (!value.some((item) => normalizeRestriction(item) === normalizeRestriction(nextValue))) {
      onChange([...value, nextValue]);
    }
    setQuery("");
    setOpen(false);
  };

  return (
    <div>
      <div className="relative">
        <div className="flex gap-2">
          <input
            className="field"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-label={lang === "zh" ? "搜尋要避免的食材" : "Search ingredients to avoid"}
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
              if (event.key === "Escape") setOpen(false);
            }}
            placeholder={lang === "zh" ? "搜尋食材或類別，例如堅果" : "Search an ingredient or group, e.g. nuts"}
          />
          <button
            type="button"
            className="ibtn press shrink-0"
            aria-label={lang === "zh" ? "加入限制" : "Add restriction"}
            disabled={!query.trim()}
            onClick={() => add()}
          >
            <AppIcon name="plus" size={18} />
          </button>
        </div>
        {open && matches.length > 0 && (
          <div id={listId} role="listbox" className="restriction-options glass-strong">
            {matches.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected="false"
                key={`${option.group ? "group" : "food"}-${option.value}`}
                className="restriction-option press"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => add(option.label[lang])}
              >
                <span>{option.label[lang]}</span>
                {option.group && <small>{lang === "zh" ? "食材類別" : "Ingredient group"}</small>}
              </button>
            ))}
          </div>
        )}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3" aria-label={lang === "zh" ? "目前食材限制" : "Current ingredient restrictions"}>
          {value.map((restriction) => (
            <button
              type="button"
              key={restriction}
              className="chip restriction-chip press icon-label"
              aria-label={lang === "zh" ? `移除 ${restriction}` : `Remove ${restriction}`}
              onClick={() => onChange(value.filter((item) => item !== restriction))}
            >
              {restriction}<AppIcon name="close" size={14} />
            </button>
          ))}
        </div>
      )}
      <p className="t-cap mt-2">
        {lang === "zh"
          ? "目前使用食材名稱文字比對；請自行確認食品標示與交叉污染。"
          : "Currently matched by ingredient name. Always verify labels and cross-contamination yourself."}
      </p>
    </div>
  );
}
