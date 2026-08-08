"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { GlassCard, Sheet, toast } from "@/components/ui";
import { AppIcon, BrandMark } from "@/components/icons";
import { Capacitor } from "@capacitor/core";
import { useRouter } from "next/navigation";

export default function LockScreenWidget() {
  const lang = useStore((state) => state.lang);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const native = Capacitor.isNativePlatform();
  const copyLink = async (mode: "scan" | "photo") => {
    const url = native
      ? `melonmate://add?mode=${mode}&source=lock-screen`
      : `${window.location.origin}/add?mode=${mode}&source=lock-screen`;
    await navigator.clipboard.writeText(url);
    toast(lang === "zh" ? "連結已複製" : "Link copied", "copy");
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
                <li>{lang === "zh" ? "點下方按鈕複製掃碼連結。" : "Copy the scanner link below."}</li>
                <li>{lang === "zh" ? "在「捷徑」建立「打開 URL」，貼上連結並命名為 MelonMate。" : "In Shortcuts, create an Open URLs shortcut, paste the link, and name it MelonMate."}</li>
                <li>{lang === "zh" ? "長按鎖定畫面 → 自訂 → 加入小工具 → 捷徑 → 選擇 MelonMate。" : "Long-press the Lock Screen → Customize → Add Widgets → Shortcuts → choose MelonMate."}</li>
              </ol>
              <button className="btn btn-primary press w-full" onClick={() => void copyLink("scan")}>
                <AppIcon name="camera" />{lang === "zh" ? "複製掃碼連結" : "Copy scanner link"}
              </button>
              <button className="btn btn-ghost press w-full" onClick={() => void copyLink("photo")}>
                <AppIcon name="magic" />{lang === "zh" ? "複製 AI 照片連結" : "Copy AI photo link"}
              </button>
              <div className="ai-disclaimer">
                {lang === "zh" ? "相機需要 HTTPS 與相機權限。" : "Camera access requires HTTPS and camera permission."}
              </div>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
