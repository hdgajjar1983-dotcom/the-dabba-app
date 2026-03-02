#!/usr/bin/env python3
"""Resize screenshots to App Store 6.5" display requirement (1290x2796)"""

from PIL import Image
import os

INPUT_DIR = "/app/screenshots/appstore"
OUTPUT_DIR = "/app/screenshots/appstore/resized"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# App Store 6.5" display requirement
TARGET_WIDTH = 1290
TARGET_HEIGHT = 2796

def resize_screenshot(input_path, output_path):
    img = Image.open(input_path)
    
    # Create a new image with the target dimensions and a background color
    background_color = (253, 248, 243)  # Cream background
    
    # Calculate scaling to fit
    scale = min(TARGET_WIDTH / img.width, TARGET_HEIGHT / img.height)
    new_width = int(img.width * scale)
    new_height = int(img.height * scale)
    
    # Resize the image
    img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Create new image with target dimensions
    new_img = Image.new('RGB', (TARGET_WIDTH, TARGET_HEIGHT), background_color)
    
    # Center the resized image
    x = (TARGET_WIDTH - new_width) // 2
    y = (TARGET_HEIGHT - new_height) // 2
    
    # Paste (handle transparency if PNG)
    if img_resized.mode == 'RGBA':
        new_img.paste(img_resized, (x, y), img_resized)
    else:
        new_img.paste(img_resized, (x, y))
    
    new_img.save(output_path, 'PNG', quality=95)
    print(f"✓ Resized: {os.path.basename(input_path)} -> {TARGET_WIDTH}x{TARGET_HEIGHT}")

def main():
    print("Resizing screenshots for App Store (6.5\" display: 1290x2796)")
    print("=" * 50)
    
    for filename in sorted(os.listdir(INPUT_DIR)):
        if filename.endswith('.png') and not filename.startswith('.'):
            input_path = os.path.join(INPUT_DIR, filename)
            output_path = os.path.join(OUTPUT_DIR, filename)
            
            if os.path.isfile(input_path):
                resize_screenshot(input_path, output_path)
    
    print("\n✅ All screenshots resized!")
    print(f"Output directory: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
