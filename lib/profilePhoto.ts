const MAX_PROFILE_PHOTO_BYTES = 15 * 1024 * 1024;
const PROFILE_PHOTO_EDGE = 384;

export const BUILT_IN_PROFILE_AVATARS = [
  { id: "watermelon-splash", src: "/avatars/watermelon-splash.svg", name: { en: "Melon Splash", zh: "西瓜浪花" } },
  { id: "cantaloupe-cat", src: "/avatars/cantaloupe-cat.svg", name: { en: "Canta Cat", zh: "哈密貓" } },
  { id: "moon-bunny", src: "/avatars/moon-bunny.svg", name: { en: "Moon Bunny", zh: "月瓜兔" } },
  { id: "chamoe-chick", src: "/avatars/chamoe-chick.svg", name: { en: "Chamoe Chick", zh: "香瓜小雞" } },
  { id: "hami-bear", src: "/avatars/hami-bear.svg", name: { en: "Hami Bear", zh: "哈密小熊" } },
  { id: "canary-star", src: "/avatars/canary-star.svg", name: { en: "Canary Star", zh: "金星甜瓜" } },
  { id: "densuke-penguin", src: "/avatars/densuke-penguin.svg", name: { en: "Densuke Pingu", zh: "黑皮企鵝" } },
  { id: "yubari-fox", src: "/avatars/yubari-fox.svg", name: { en: "Yubari Fox", zh: "夕張小狐" } },
  { id: "honeydew-frog", src: "/avatars/honeydew-frog.svg", name: { en: "Honeydew Frog", zh: "蜜瓜青蛙" } },
  { id: "watermelon-dino", src: "/avatars/watermelon-dino.svg", name: { en: "Melon Dino", zh: "西瓜恐龍" } },
  { id: "cantaloupe-shiba", src: "/avatars/cantaloupe-shiba.svg", name: { en: "Canta Shiba", zh: "哈密柴犬" } },
  { id: "canary-duck", src: "/avatars/canary-duck.svg", name: { en: "Canary Duck", zh: "金瓜小鴨" } },
  { id: "chamoe-bee", src: "/avatars/chamoe-bee.svg", name: { en: "Chamoe Bee", zh: "香瓜蜜蜂" } },
  { id: "moon-gold-owl", src: "/avatars/moon-gold-owl.svg", name: { en: "Moon Gold Owl", zh: "月金貓頭鷹" } },
  { id: "densuke-bat", src: "/avatars/densuke-bat.svg", name: { en: "Densuke Bat", zh: "黑瓜蝙蝠" } },
  { id: "snow-melon-seal", src: "/avatars/snow-melon-seal.svg", name: { en: "Snow Melon Seal", zh: "雪瓜海豹" } },
  { id: "yubari-panda", src: "/avatars/yubari-panda.svg", name: { en: "Yubari Panda", zh: "夕張熊貓" } },
  { id: "hami-hamster", src: "/avatars/hami-hamster.svg", name: { en: "Hami Hamster", zh: "哈密倉鼠" } },
  { id: "galia-turtle", src: "/avatars/galia-turtle.svg", name: { en: "Galia Turtle", zh: "綠瓜烏龜" } },
  { id: "crenshaw-koala", src: "/avatars/crenshaw-koala.svg", name: { en: "Crenshaw Koala", zh: "香瓜無尾熊" } },
  { id: "piel-whale", src: "/avatars/piel-whale.svg", name: { en: "Melon Whale", zh: "青皮鯨魚" } },
  { id: "santa-deer", src: "/avatars/santa-deer.svg", name: { en: "Santa Melon Deer", zh: "聖誕瓜小鹿" } },
  { id: "casaba-lamb", src: "/avatars/casaba-lamb.svg", name: { en: "Casaba Lamb", zh: "卡薩巴小羊" } },
  { id: "sprite-mouse", src: "/avatars/sprite-mouse.svg", name: { en: "Melon Sprite", zh: "甜瓜精靈" } },
  { id: "emerald-dragon", src: "/avatars/emerald-dragon.svg", name: { en: "Emerald Dragon", zh: "翡翠小龍" } },
  { id: "ruby-otter", src: "/avatars/ruby-otter.svg", name: { en: "Ruby Otter", zh: "紅寶石水獺" } },
  { id: "golden-capybara", src: "/avatars/golden-capybara.svg", name: { en: "Golden Capy", zh: "金瓜水豚" } },
  { id: "melon-soda-robot", src: "/avatars/melon-soda-robot.svg", name: { en: "Melon Soda Bot", zh: "蜜瓜汽水機器人" } },
  { id: "melon-roll-snail", src: "/avatars/melon-roll-snail.svg", name: { en: "Melon Roll Snail", zh: "甜瓜捲蝸牛" } },
  { id: "melon-sprout-sloth", src: "/avatars/melon-sprout-sloth.svg", name: { en: "Sprout Sloth", zh: "嫩芽樹懶" } },
  { id: "melon-slice-crab", src: "/avatars/melon-slice-crab.svg", name: { en: "Melon Crab", zh: "西瓜螃蟹" } },
  { id: "melon-cloud-unicorn", src: "/avatars/melon-cloud-unicorn.svg", name: { en: "Melon Unicorn", zh: "甜瓜獨角獸" } },
] as const;

const BUILT_IN_PROFILE_AVATAR_SOURCES = new Set<string>(
  BUILT_IN_PROFILE_AVATARS.map((avatar) => avatar.src)
);

export function isProfilePhotoDataUrl(value: unknown): value is string {
  return typeof value === "string"
    && value.length <= 350_000
    && /^data:image\/(?:jpeg|png|webp);base64,/i.test(value);
}

export function isProfilePhotoSource(value: unknown): value is string {
  return isProfilePhotoDataUrl(value)
    || (typeof value === "string" && BUILT_IN_PROFILE_AVATAR_SOURCES.has(value));
}

export async function prepareProfilePhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not-an-image");
  if (file.size > MAX_PROFILE_PHOTO_BYTES) throw new Error("image-too-large");

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const sourceEdge = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = Math.max(0, (image.naturalWidth - sourceEdge) / 2);
    const sourceY = Math.max(0, (image.naturalHeight - sourceEdge) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = PROFILE_PHOTO_EDGE;
    canvas.height = PROFILE_PHOTO_EDGE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("image-unavailable");

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceEdge,
      sourceEdge,
      0,
      0,
      PROFILE_PHOTO_EDGE,
      PROFILE_PHOTO_EDGE
    );
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image-unavailable"));
    image.src = src;
  });
}
