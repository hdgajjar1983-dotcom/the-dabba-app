#!/usr/bin/env python3
"""Generate app icons for The Dabba in various sizes"""

from PIL import Image, ImageDraw
import os
import math

# Output directory
OUTPUT_DIR = "/app/frontend/assets/images"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Royal Gujarati Colors
MAROON = (139, 21, 56)
MAROON_DARK = (93, 14, 36)
GOLD = (212, 175, 55)
GOLD_LIGHT = (244, 228, 186)
BRASS = (205, 133, 63)
BRASS_GOLD = (184, 134, 11)
CREAM = (253, 248, 243)

def draw_circle_gradient(draw, center, radius, color1, color2):
    """Draw a simple radial gradient circle"""
    for i in range(radius, 0, -1):
        ratio = i / radius
        r = int(color1[0] * ratio + color2[0] * (1 - ratio))
        g = int(color1[1] * ratio + color2[1] * (1 - ratio))
        b = int(color1[2] * ratio + color2[2] * (1 - ratio))
        draw.ellipse([center[0]-i, center[1]-i, center[0]+i, center[1]+i], fill=(r, g, b))

def create_app_icon(size):
    """Create an app icon of given size"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    padding = size // 20
    
    # Background - Maroon gradient circle
    outer_radius = center - padding
    draw_circle_gradient(draw, (center, center), outer_radius, MAROON, MAROON_DARK)
    
    # Gold ring
    ring_width = max(2, size // 40)
    for i in range(ring_width):
        draw.ellipse([
            padding + i, padding + i,
            size - padding - i, size - padding - i
        ], outline=GOLD, width=1)
    
    # Inner decorative ring
    inner_ring = outer_radius - size // 12
    draw.ellipse([
        center - inner_ring, center - inner_ring,
        center + inner_ring, center + inner_ring
    ], outline=GOLD_LIGHT, width=max(1, size // 100))
    
    # Dabba (Tiffin) - Main body
    dabba_width = size // 3
    dabba_height = size // 5
    dabba_top = center - dabba_height // 2 + size // 20
    
    # Dabba base ellipse
    base_y = dabba_top + dabba_height
    draw.ellipse([
        center - dabba_width, base_y - size // 20,
        center + dabba_width, base_y + size // 20
    ], fill=BRASS_GOLD)
    
    # Dabba body rectangle
    draw.rectangle([
        center - dabba_width, dabba_top,
        center + dabba_width, base_y
    ], fill=BRASS)
    
    # Dabba top ellipse
    draw.ellipse([
        center - dabba_width, dabba_top - size // 20,
        center + dabba_width, dabba_top + size // 20
    ], fill=GOLD_LIGHT)
    
    # Lid
    lid_width = dabba_width - size // 20
    lid_top = dabba_top - size // 10
    draw.ellipse([
        center - lid_width, lid_top - size // 30,
        center + lid_width, lid_top + size // 30
    ], fill=GOLD)
    draw.ellipse([
        center - lid_width + size // 30, lid_top - size // 40,
        center + lid_width - size // 30, lid_top + size // 40
    ], fill=GOLD_LIGHT)
    
    # Handle (arc)
    handle_width = size // 6
    handle_top = lid_top - size // 8
    handle_thickness = max(2, size // 30)
    
    # Draw handle as thick arc
    for t in range(handle_thickness):
        draw.arc([
            center - handle_width - t, handle_top - t,
            center + handle_width + t, lid_top + t
        ], start=200, end=340, fill=GOLD, width=2)
    
    # Steam wisps
    steam_color = (*GOLD_LIGHT, 200)
    steam_positions = [
        (center - size // 10, handle_top - size // 20),
        (center, handle_top - size // 15),
        (center + size // 10, handle_top - size // 20),
    ]
    
    for x, y in steam_positions:
        # Simple wavy line for steam
        for i in range(3):
            y_offset = y - i * (size // 30)
            x_offset = x + (i % 2) * (size // 40) - size // 80
            draw.ellipse([
                x_offset - size // 60, y_offset - size // 40,
                x_offset + size // 60, y_offset
            ], fill=GOLD_LIGHT)
    
    # Decorative dots on dabba
    dot_radius = max(2, size // 50)
    dot_y = dabba_top + dabba_height // 2
    for x in [center - dabba_width // 2, center, center + dabba_width // 2]:
        draw.ellipse([
            x - dot_radius, dot_y - dot_radius,
            x + dot_radius, dot_y + dot_radius
        ], fill=GOLD_LIGHT)
    
    return img

def create_adaptive_icon_foreground(size):
    """Create Android adaptive icon foreground"""
    # Adaptive icons need more padding
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    
    # Create icon at smaller size with padding
    icon_size = int(size * 0.6)  # 60% of size for safe zone
    icon = create_app_icon(icon_size)
    
    # Center it
    offset = (size - icon_size) // 2
    img.paste(icon, (offset, offset), icon)
    
    return img

def main():
    print("Generating The Dabba app icons...")
    
    # iOS icon sizes
    ios_sizes = [
        (180, "icon-180.png"),  # iPhone @3x
        (167, "icon-167.png"),  # iPad Pro @2x
        (152, "icon-152.png"),  # iPad @2x
        (120, "icon-120.png"),  # iPhone @2x
        (1024, "icon-1024.png"),  # App Store
    ]
    
    # Android icon sizes
    android_sizes = [
        (512, "icon-512.png"),  # Play Store
        (192, "icon-192.png"),  # xxxhdpi
        (144, "icon-144.png"),  # xxhdpi
        (96, "icon-96.png"),    # xhdpi
        (72, "icon-72.png"),    # hdpi
        (48, "icon-48.png"),    # mdpi
    ]
    
    # Main icon
    main_icon = create_app_icon(1024)
    main_icon.save(os.path.join(OUTPUT_DIR, "icon.png"))
    print(f"  ✓ Created icon.png (1024x1024)")
    
    # iOS icons
    for size, filename in ios_sizes:
        icon = create_app_icon(size)
        icon.save(os.path.join(OUTPUT_DIR, filename))
        print(f"  ✓ Created {filename} ({size}x{size})")
    
    # Android icons
    for size, filename in android_sizes:
        icon = create_app_icon(size)
        icon.save(os.path.join(OUTPUT_DIR, filename))
        print(f"  ✓ Created {filename} ({size}x{size})")
    
    # Adaptive icon foreground (Android)
    adaptive_fg = create_adaptive_icon_foreground(512)
    adaptive_fg.save(os.path.join(OUTPUT_DIR, "adaptive-icon.png"))
    print(f"  ✓ Created adaptive-icon.png (512x512)")
    
    # Splash image (larger with text area)
    splash = create_app_icon(400)
    splash_full = Image.new('RGBA', (400, 400), CREAM)
    offset = (400 - 400) // 2
    splash_full.paste(splash, (offset, offset), splash)
    splash_full.save(os.path.join(OUTPUT_DIR, "splash-icon.png"))
    print(f"  ✓ Created splash-icon.png (400x400)")
    
    # Favicon
    favicon = create_app_icon(32)
    favicon.save(os.path.join(OUTPUT_DIR, "favicon.png"))
    print(f"  ✓ Created favicon.png (32x32)")
    
    print("\n✅ All icons generated successfully!")
    print(f"   Output directory: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
