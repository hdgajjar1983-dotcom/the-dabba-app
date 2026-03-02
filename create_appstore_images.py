#!/usr/bin/env python3
"""Resize screenshots to App Store 6.5" display requirement (1290x2796)"""

from PIL import Image, ImageDraw, ImageFont
import os

INPUT_DIR = "/app/appstore_screenshots"
OUTPUT_DIR = "/app/appstore_final"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# App Store 6.5" display requirement
TARGET_WIDTH = 1290
TARGET_HEIGHT = 2796

# Royal Gujarati Colors
CREAM_BG = (253, 248, 243)
MAROON = (139, 21, 56)
GOLD = (212, 175, 55)

def resize_and_frame_screenshot(input_path, output_path, caption=""):
    img = Image.open(input_path)
    
    # Create new image with target dimensions and cream background
    new_img = Image.new('RGB', (TARGET_WIDTH, TARGET_HEIGHT), CREAM_BG)
    
    # Calculate scaling to fit with padding
    padding_top = 200  # Space for caption
    padding_bottom = 100
    padding_sides = 60
    
    available_width = TARGET_WIDTH - (padding_sides * 2)
    available_height = TARGET_HEIGHT - padding_top - padding_bottom
    
    scale = min(available_width / img.width, available_height / img.height)
    new_width = int(img.width * scale)
    new_height = int(img.height * scale)
    
    # Resize the screenshot
    img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Center horizontally, position below caption
    x = (TARGET_WIDTH - new_width) // 2
    y = padding_top + (available_height - new_height) // 2
    
    # Add rounded corners effect (create mask)
    corner_radius = 40
    mask = Image.new('L', (new_width, new_height), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, new_width, new_height], corner_radius, fill=255)
    
    # Apply shadow
    shadow_offset = 20
    shadow = Image.new('RGBA', (new_width + shadow_offset*2, new_height + shadow_offset*2), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle([shadow_offset, shadow_offset, new_width + shadow_offset, new_height + shadow_offset], 
                                   corner_radius, fill=(0, 0, 0, 50))
    
    # Paste shadow
    new_img.paste(Image.new('RGB', shadow.size, CREAM_BG), (x - shadow_offset, y - shadow_offset))
    
    # Create a version with alpha for proper compositing
    if img_resized.mode != 'RGBA':
        img_resized = img_resized.convert('RGBA')
    
    # Apply mask to image
    img_with_corners = Image.new('RGBA', (new_width, new_height), (0, 0, 0, 0))
    img_with_corners.paste(img_resized, (0, 0))
    img_with_corners.putalpha(mask)
    
    # Paste the image
    new_img.paste(img_resized.convert('RGB'), (x, y))
    
    # Add caption at top
    draw = ImageDraw.Draw(new_img)
    
    # Draw decorative line
    line_y = 80
    line_width = 200
    draw.line([(TARGET_WIDTH//2 - line_width, line_y), (TARGET_WIDTH//2 - 30, line_y)], fill=GOLD, width=2)
    draw.ellipse([(TARGET_WIDTH//2 - 15, line_y - 8), (TARGET_WIDTH//2 + 15, line_y + 8)], fill=GOLD)
    draw.line([(TARGET_WIDTH//2 + 30, line_y), (TARGET_WIDTH//2 + line_width, line_y)], fill=GOLD, width=2)
    
    # Add caption text
    if caption:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 48)
        except:
            font = ImageFont.load_default()
        
        bbox = draw.textbbox((0, 0), caption, font=font)
        text_width = bbox[2] - bbox[0]
        draw.text(((TARGET_WIDTH - text_width) // 2, 120), caption, fill=MAROON, font=font)
    
    new_img.save(output_path, 'PNG', quality=95)
    print(f"✓ Created: {os.path.basename(output_path)} ({TARGET_WIDTH}x{TARGET_HEIGHT})")

def main():
    print("Creating App Store screenshots (6.5\" display: 1290x2796)")
    print("=" * 55)
    
    screenshots = [
        ("screenshot_1_login.png", "screenshot_1.png", "Welcome to The Dabba"),
        ("screenshot_2_dashboard.png", "screenshot_2.png", "Fresh Gujarati Meals Daily"),
        ("screenshot_3_kitchen.png", "screenshot_3.png", "Easy Kitchen Management"),
    ]
    
    for input_name, output_name, caption in screenshots:
        input_path = os.path.join(INPUT_DIR, input_name)
        output_path = os.path.join(OUTPUT_DIR, output_name)
        
        if os.path.exists(input_path):
            resize_and_frame_screenshot(input_path, output_path, caption)
        else:
            print(f"⚠ Not found: {input_name}")
    
    print("\n✅ All App Store screenshots ready!")
    print(f"Output: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
