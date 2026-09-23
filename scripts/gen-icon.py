# 生成插件图标: 深色科技渐变圆角方块 + 白色对话气泡 + 星形闪光
from PIL import Image, ImageDraw
import math

S = 1024  # 画布, 最后缩到 256
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# ---- 渐变背景 (左上靛蓝 -> 右下青色), 圆角方形 ----
R = int(S * 0.22)
grad = Image.new('RGBA', (S, S))
gd = ImageDraw.Draw(grad)
c1, c2 = (49, 46, 129), (14, 165, 233)  # indigo-700 -> sky-500
for y in range(S):
    t = (y / S + 0) * 0.5 + (0)  # 垂直渐变为主
    # 用对角线混合: 距离沿 (x+y) 方向
for y in range(S):
    for_x = None
# 对角渐变: 逐行画, 横向用叠加方式太慢, 直接按 (x+y) 逐像素太慢 -> 用小图放大
small = Image.new('RGBA', (64, 64))
sd = ImageDraw.Draw(small)
for y in range(64):
    for x in range(64):
        t = (x + y) / 126
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        sd.point((x, y), fill=(r, g, b, 255))
grad = small.resize((S, S), Image.BICUBIC)

mask = Image.new('L', (S, S), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle([0, 0, S - 1, S - 1], radius=R, fill=255)
img.paste(grad, (0, 0), mask)
d = ImageDraw.Draw(img)

# ---- 白色对话气泡 (圆角矩形 + 左下尾巴) ----
WHITE = (255, 255, 255, 255)
bx0, by0, bx1, by1 = int(S*0.20), int(S*0.22), int(S*0.80), int(S*0.68)
d.rounded_rectangle([bx0, by0, bx1, by1], radius=int(S*0.10), fill=WHITE)
# 尾巴: 左下角三角形
tail = [(int(S*0.28), int(S*0.66)), (int(S*0.28), int(S*0.82)), (int(S*0.44), int(S*0.66))]
d.polygon(tail, fill=WHITE)

# ---- 气泡内的闪光星 (四角星, 用背景靛蓝色) ----
def star4(cx, cy, r, fill):
    # 四角星: 8 个点交替外半径 r 和内半径 r*0.28
    pts = []
    for i in range(8):
        ang = math.pi / 2 * (i / 2) - math.pi / 2 + (i % 2) * (math.pi / 8)
        pass
    pts = []
    for i in range(8):
        # 外点在 0,90,180,270 度; 内点在其间
        ang = -math.pi/2 + i * math.pi/4
        rad = r if i % 2 == 0 else r * 0.3
        pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    d.polygon(pts, fill=fill)

INK = (49, 46, 129, 255)
star4(int(S*0.40), int(S*0.45), int(S*0.14), INK)
star4(int(S*0.62), int(S*0.40), int(S*0.07), INK)

img = img.resize((256, 256), Image.LANCZOS)
img.save('src/icon.png')
print('saved src/icon.png')
