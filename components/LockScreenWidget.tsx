"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { GlassCard, Sheet, toast } from "@/components/ui";
import { AppIcon, BrandMark } from "@/components/icons";
import { Capacitor } from "@capacitor/core";
import { useRouter } from "next/navigation";
import { quickLogUrl, type QuickLogMode } from "@/lib/quickLog";

function fallbackCopy(value: string): boolean {
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  return copied;
}

export default function LockScreenWidget() {
  const lang = useStore((state) => state.lang);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const native = Capacitor.isNativePlatform();
  const shortcutUrl = (mode: QuickLogMode) => quickLogUrl({
    mode,
    native,
    currentOrigin: window.location.origin,
    publicOrigin: process.env.NEXT_PUBLIC_SITE_URL,
  });
  const copyLink = async (mode: QuickLogMode) => {
    const url = shortcutUrl(mode);
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) await navigator.clipboard.writeText(url);
      else if (!fallbackCopy(url)) throw new Error("copy-failed");
      toast(
        lang === "zh"
          ? `${mode === "scan" ? "掃碼" : "AI 照片"}捷徑連結已複製；請貼到「打開 URL」。`
          : `${mode === "scan" ? "Scanner" : "AI photo"} shortcut link copied — paste it into Open URLs.`,
        "copy"
      );
    } catch {
      toast(lang === "zh" ? "無法複製。請在 HTTPS 網站再試一次。" : "Couldn’t copy the link. Open the HTTPS app and try again.", "error");
    }
  };

  return (
    <>
      <GlassCard className="widget-card p-4 mb-4" onClick={() => setOpen(true)}>
        <span className="icon-tile"><AppIcon name="lock" size={21} /></span>
        <div className="flex-1 min-w-0">
          <div className="font-bold">{lang === "zh" ? "鎖定畫面快速記錄" : "Lock Screen quick log"}</div>
          <div className="t-cap mt-1">{lang === "zh" ? "加入「記錄飲食」小工具，一按即可開始" : "Add a Log Food widget and start in one tap"}</div>
        </div>
        <AppIcon name="next" size={17} />
      </GlassCard>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={<span className="icon-label"><AppIcon name="lock" />{lang === "zh" ? "鎖定畫面快速記錄" : "Lock Screen quick log"}</span>}
      >
        <div className="flex flex-col gap-4 pb-2">
          <div className="lock-screen-demo">
            <div className="lock-time">9:41</div>
            <div className="lock-date">{lang === "zh" ? "8 月 7 日，星期五" : "Friday, August 7"}</div>
            <div className="lock-widget-pill"><BrandMark size={22} /><b>{lang === "zh" ? "記錄飲食" : "Log food"}</b><AppIcon name="kitchen" size={20} /></div>
          </div>

          <div className="t-sub">
            {native
              ? lang === "zh"
                ? "MelonMate 已包含原生鎖定畫面小工具。點一下即可直接前往飲食記錄。"
                : "MelonMate includes a native Lock Screen widget. Tap it to jump straight to food logging."
              : lang === "zh"
                ? "網頁版可使用 Apple「捷徑」小工具，把快速連結放到鎖定畫面。"
                : "The web version can use an Apple Shortcuts widget to open food logging from the Lock Screen."}
          </div>

          {native ? (
            <>
              <ol className="widget-steps">
                <li>{lang === "zh" ? "先開啟此版本的 MelonMate 一次。" : "Open this version of MelonMate once."}</li>
                <li>{lang === "zh" ? "長按鎖定畫面 → 自訂 → 選擇「鎖定畫面」。" : "Long-press the Lock Screen → Customize → choose Lock Screen."}</li>
                <li>{lang === "zh" ? "點小工具區域 → MelonMate →「Quick Food Log」。" : "Tap the widget area → MelonMate → Quick Food Log."}</li>
                <li>{lang === "zh" ? "選擇圓形、長方形或行內版，然後按「完成」。" : "Choose the circular, rectangular, or inline style, then tap Done."}</li>
              </ol>
              <button className="btn btn-primary press w-full" onClick={() => router.push("/add?source=lock-screen-preview")}>
                <AppIcon name="kitchen" />{lang === "zh" ? "試用飲食記錄" : "Try the food logger"}
              </button>
            </>
          ) : (
            <>
              <ol className="widget-steps">
                <li>{lang === "zh" ? "選擇掃碼或 AI 照片，並複製該捷徑連結。" : "Choose Scanner or AI photo and copy its shortcut link."}</li>
                <li>{lang === "zh" ? "在「捷徑」建立「打開 URL」，貼上連結並命名為 MelonMate。" : "In Shortcuts, create an Open URLs shortcut, paste the link, and name it MelonMate."}</li>
                <li>{lang === "zh" ? "長按鎖定畫面 → 自訂 → 加入小工具 → 捷徑 → 選擇 MelonMate。" : "Long-press the Lock Screen → Customize → Add Widgets → Shortcuts → choose MelonMate."}</li>
              </ol>
              <button className="btn btn-primary press w-full" onClick={() => void copyLink("scan")}>
                <AppIcon name="camera" />{lang === "zh" ? "複製掃碼連結" : "Copy scanner link"}
              </button>
              <button className="btn btn-ghost press w-full" onClick={() => void copyLink("photo")}>
                <AppIcon name="magic" />{lang === "zh" ? "複製 AI 照片連結" : "Copy AI photo link"}
              </button>
              <div className="flex gap-2">
                <button className="btn btn-ghost press flex-1" onClick={() => router.push("/add?mode=scan&source=lock-screen-preview")}>{lang === "zh" ? "測試掃碼" : "Test scanner"}</button>
                <button className="btn btn-ghost press flex-1" onClick={() => router.push("/add?mode=photo&source=lock-screen-preview")}>{lang === "zh" ? "測試照片" : "Test photo"}</button>
              </div>
              <div className="ai-disclaimer">
                {lang === "zh" ? "複製的是已設定的 HTTPS App 連結，不會使用 localhost。相機需要 HTTPS 與權限。" : "Links use the configured HTTPS app—not localhost. Camera access requires HTTPS and permission."}
              </div>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
