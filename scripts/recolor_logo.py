from pathlib import Path
import numpy as np
from PIL import Image

src = Path(
    r"C:\Users\DELL\.grok\sessions\C%3A%5CUsers%5CDELL\01a07c35-e2a4-7de3-bbfe-9808742ec8a1\images\image-b5006e20-ce0c-43a5-aced-020af3ced3bf.png"
)
out_dir = Path(r"C:\Users\DELL\Downloads\SignalGate\public")
out_dir.mkdir(exist_ok=True)
app_dir = Path(r"C:\Users\DELL\Downloads\SignalGate\app")

img = Image.open(src).convert("RGBA")
arr = np.array(img).astype(np.float32)
r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]

visible = a > 8
red_mask = visible & (r > 70) & (r > g * 1.25) & (r > b * 1.25)
blue_mask = visible & (~red_mask) & (b > 60) & (b > r * 1.15) & (b >= g * 0.85)
cyan_line = visible & (~red_mask) & (~blue_mask) & (g > 40) & (b > 40) & (r < 80)

# Emerald rim #10b981 with original value variation
t = np.clip(r / 255.0, 0, 1)
arr[red_mask, 0] = 6 + t[red_mask] * 40
arr[red_mask, 1] = 130 + t[red_mask] * 70
arr[red_mask, 2] = 90 + t[red_mask] * 50

# Eye fill: teal-emerald
bt = np.clip(b / 255.0, 0, 1)
arr[blue_mask, 0] = 12 + bt[blue_mask] * 40
arr[blue_mask, 1] = 160 + bt[blue_mask] * 70
arr[blue_mask, 2] = 130 + bt[blue_mask] * 70

# Eye outline
arr[cyan_line, 0] = 16
arr[cyan_line, 1] = 200
arr[cyan_line, 2] = 160

out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")

# Crop to the shield rim/eye, ignore leftover black sidebars
color = red_mask | blue_mask | cyan_line
ys, xs = np.where(color)
pad = 18
x0, x1 = max(0, int(xs.min()) - pad), min(out.width, int(xs.max()) + pad + 1)
y0, y1 = max(0, int(ys.min()) - pad), min(out.height, int(ys.max()) + pad + 1)
cropped = out.crop((x0, y0, x1, y1))
side = max(cropped.width, cropped.height)
canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
canvas.paste(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2))

logo = canvas.resize((512, 512), Image.Resampling.LANCZOS)
icon = canvas.resize((180, 180), Image.Resampling.LANCZOS)
favicon = canvas.resize((32, 32), Image.Resampling.LANCZOS)

logo.save(out_dir / "logo.png")
icon.save(out_dir / "apple-touch-icon.png")
favicon.save(out_dir / "favicon.png")
logo.save(app_dir / "icon.png")
icon.save(app_dir / "apple-icon.png")
print("wrote", out_dir / "logo.png", logo.size)
