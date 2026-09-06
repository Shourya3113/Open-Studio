import os
from PIL import Image, ImageDraw

icons_dir = os.path.join("src-tauri", "icons")
os.makedirs(icons_dir, exist_ok=True)

# Generate a high-res master image (512x512)
size = 512
img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Rounded rectangle background: dark slate with electric blue border
bg_color = (15, 23, 42, 255)       # #0F172A
border_color = (37, 99, 235, 255)  # #2563EB
accent_color = (56, 189, 248, 255) # #38BDF8

# Outer rounded rectangle
draw.rounded_rectangle([32, 32, size - 32, size - 32], radius=96, fill=bg_color, outline=border_color, width=12)

# Central modern "OS" geometric motif (an outer loop and an inner code slash)
draw.ellipse([140, 140, size - 140, size - 140], outline=accent_color, width=28)
draw.line([190, 320, 320, 190], fill=(255, 255, 255, 255), width=28)

# Save master icon.png
img.save(os.path.join(icons_dir, "icon.png"))

# Save icon.ico with multiple resolutions
sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
img.save(os.path.join(icons_dir, "icon.ico"), sizes=sizes)

# Save standard png sizes required by Tauri
img.resize((32, 32), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, "32x32.png"))
img.resize((128, 128), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, "128x128.png"))
img.resize((256, 256), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, "128x128@2x.png"))

# Windows Store logo sizes
win_sizes = {
    "Square30x30Logo.png": (30, 30),
    "Square44x44Logo.png": (44, 44),
    "Square71x71Logo.png": (71, 71),
    "Square89x89Logo.png": (89, 89),
    "Square107x107Logo.png": (107, 107),
    "Square142x142Logo.png": (142, 142),
    "Square150x150Logo.png": (150, 150),
    "Square284x284Logo.png": (284, 284),
    "Square310x310Logo.png": (310, 310),
    "StoreLogo.png": (50, 50),
}
for name, s in win_sizes.items():
    img.resize(s, Image.Resampling.LANCZOS).save(os.path.join(icons_dir, name))

print("Successfully generated all Tauri icons in src-tauri/icons/")
