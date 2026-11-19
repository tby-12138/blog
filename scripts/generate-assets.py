"""Generate the blog's social preview and touch icon.

Usage: python scripts/generate-assets.py
Requires Pillow. The generated files are committed, so this is only needed
when you want to change the artwork or the site name.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
PUBLIC.mkdir(exist_ok=True)
(PUBLIC / "images").mkdir(exist_ok=True)

BG = (247, 245, 240)
INK = (27, 26, 23)
MUTED = (123, 116, 104)
ACCENT = (178, 58, 46)
BORDER = (229, 223, 212)

FONT_CANDIDATES = [
    "C:/Windows/Fonts/msyhbd.ttc",
    "C:/Windows/Fonts/msyh.ttc",
    "C:/Windows/Fonts/simhei.ttf",
    "/System/Library/Fonts/PingFang.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
]
SERIF_CANDIDATES = [
    "C:/Windows/Fonts/STSONG.TTF",
    "C:/Windows/Fonts/simsun.ttc",
    "/System/Library/Fonts/Songti.ttc",
    "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc",
]


def load_font(candidates: list[str], size: int) -> ImageFont.FreeTypeFont:
    for path in candidates:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default(size=size)


def rounded_rect(draw: ImageDraw.ImageDraw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def make_og() -> None:
    width, height = 1200, 630
    image = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(image)

    # 细网格
    grid = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid)
    for x in range(0, width, 64):
        grid_draw.line([(x, 0), (x, height)], fill=(27, 26, 23, 9))
    for y in range(0, height, 64):
        grid_draw.line([(0, y), (width, y)], fill=(27, 26, 23, 9))
    image = Image.alpha_composite(image.convert("RGBA"), grid).convert("RGB")
    draw = ImageDraw.Draw(image)

    # 右侧装饰圆与印章
    draw.ellipse((880, 120, 1300, 540), outline=(207, 198, 182), width=2)
    draw.ellipse((930, 170, 1250, 490), outline=(229, 223, 212), width=1)
    rounded_rect(draw, (1010, 245, 1150, 385), 14, ACCENT)
    seal_font = load_font(SERIF_CANDIDATES, 82)
    draw.text((1080, 315), "白", font=seal_font, fill=(255, 255, 255), anchor="mm")

    # 顶部标识
    rounded_rect(draw, (88, 76, 132, 120), 8, ACCENT)
    mini_font = load_font(SERIF_CANDIDATES, 26)
    draw.text((110, 98), "白", font=mini_font, fill=(255, 255, 255), anchor="mm")
    mono = load_font(FONT_CANDIDATES, 18)
    draw.text((150, 86), "BLOG · EST. 2026", font=mono, fill=MUTED)

    # 标题
    title_font = load_font(SERIF_CANDIDATES, 112)
    draw.text((86, 190), "白雲札記", font=title_font, fill=INK)

    # 副标题
    body_font = load_font(FONT_CANDIDATES, 30)
    draw.text((90, 360), "记录技术、阅读与生活里", font=body_font, fill=MUTED)
    draw.text((90, 404), "值得留下的片段。", font=body_font, fill=MUTED)

    # 底部分隔与署名
    draw.line((90, 500, 1110, 500), fill=BORDER, width=1)
    small = load_font(FONT_CANDIDATES, 18)
    draw.text((90, 528), "ASTRO  ·  MARKDOWN  ·  GITHUB PAGES", font=small, fill=MUTED)
    draw.text((1110, 528), "白雲", font=small, fill=ACCENT, anchor="ra")

    image.save(PUBLIC / "og.png", optimize=True)


def make_icon(size: int, name: str) -> None:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    rounded_rect(draw, (0, 0, size, size), int(size * 0.22), ACCENT)
    font = load_font(SERIF_CANDIDATES, int(size * 0.58))
    draw.text((size / 2, size * 0.52), "白", font=font, fill=(255, 255, 255), anchor="mm")
    image.save(PUBLIC / name)


if __name__ == "__main__":
    make_og()
    make_icon(180, "apple-touch-icon.png")
    make_icon(64, "favicon.png")
    print("assets written to", PUBLIC)
