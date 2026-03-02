#!/usr/bin/env python3
"""Create iPad 13-inch screenshot (2048 x 2732)"""

from PIL import Image, ImageDraw, ImageFont
import os

OUTPUT_DIR = "/app/appstore_correct"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# iPad 13" display requirement
WIDTH = 2048
HEIGHT = 2732

# Royal Gujarati Colors
CREAM = (253, 248, 243)
MAROON = (139, 21, 56)
MAROON_DARK = (93, 14, 36)
GOLD = (212, 175, 55)
GOLD_LIGHT = (244, 228, 186)
TEXT_DARK = (61, 41, 20)
TEXT_LIGHT = (139, 115, 85)
WHITE = (255, 255, 255)
GREEN = (46, 125, 50)

def create_ipad_screenshot():
    """iPad Welcome Screen"""
    img = Image.new('RGB', (WIDTH, HEIGHT), CREAM)
    draw = ImageDraw.Draw(img)
    
    try:
        font_xlarge = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 80)
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 60)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", 48)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
        font_logo = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 140)
    except:
        font_xlarge = font_large = font_medium = font_small = font_logo = ImageFont.load_default()
    
    # Top caption
    caption = "Welcome to The Dabba"
    bbox = draw.textbbox((0, 0), caption, font=font_xlarge)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, 150), caption, fill=MAROON, font=font_xlarge)
    
    # Decorative line
    line_y = 280
    draw.line([(WIDTH//2 - 300, line_y), (WIDTH//2 - 40, line_y)], fill=GOLD, width=4)
    draw.ellipse([(WIDTH//2 - 20, line_y - 15), (WIDTH//2 + 20, line_y + 15)], fill=GOLD)
    draw.line([(WIDTH//2 + 40, line_y), (WIDTH//2 + 300, line_y)], fill=GOLD, width=4)
    
    # Center content card
    card_width = 900
    card_height = 1400
    card_x = (WIDTH - card_width) // 2
    card_y = 380
    
    # Card shadow
    draw.rounded_rectangle([card_x + 20, card_y + 20, card_x + card_width + 20, card_y + card_height + 20], 
                          40, fill=(200, 200, 200))
    
    # Card body
    draw.rounded_rectangle([card_x, card_y, card_x + card_width, card_y + card_height], 
                          40, fill=WHITE)
    
    # Logo circle
    logo_size = 280
    logo_x = WIDTH // 2 - logo_size // 2
    logo_y = card_y + 100
    
    # Logo gradient
    for i in range(logo_size // 2, 0, -1):
        ratio = i / (logo_size // 2)
        color = tuple(int(MAROON[j] * ratio + MAROON_DARK[j] * (1 - ratio)) for j in range(3))
        draw.ellipse([logo_x + logo_size//2 - i, logo_y + logo_size//2 - i,
                     logo_x + logo_size//2 + i, logo_y + logo_size//2 + i], fill=color)
    
    # Logo border
    draw.ellipse([logo_x - 6, logo_y - 6, logo_x + logo_size + 6, logo_y + logo_size + 6], 
                outline=GOLD, width=6)
    
    # Logo text "D"
    draw.text((logo_x + 85, logo_y + 55), "D", fill=GOLD_LIGHT, font=font_logo)
    
    # App name
    app_name = "The Dabba"
    bbox = draw.textbbox((0, 0), app_name, font=font_xlarge)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, logo_y + logo_size + 60), app_name, fill=MAROON, font=font_xlarge)
    
    # Tagline
    tagline = "Gujarati Ghar Ka Swad"
    bbox = draw.textbbox((0, 0), tagline, font=font_medium)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, logo_y + logo_size + 160), tagline, fill=GOLD, font=font_medium)
    
    # Description
    desc = "Fresh homestyle meals delivered daily"
    bbox = draw.textbbox((0, 0), desc, font=font_small)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, logo_y + logo_size + 230), desc, fill=TEXT_LIGHT, font=font_small)
    
    # Email input
    input_y = logo_y + logo_size + 340
    draw.rounded_rectangle([card_x + 80, input_y, card_x + card_width - 80, input_y + 80], 
                          15, fill=CREAM, outline=(232, 222, 209), width=2)
    draw.text((card_x + 120, input_y + 22), "Enter your email", fill=TEXT_LIGHT, font=font_small)
    
    # Password input
    input_y += 110
    draw.rounded_rectangle([card_x + 80, input_y, card_x + card_width - 80, input_y + 80], 
                          15, fill=CREAM, outline=(232, 222, 209), width=2)
    draw.text((card_x + 120, input_y + 22), "Enter your password", fill=TEXT_LIGHT, font=font_small)
    
    # Sign In button
    btn_y = input_y + 130
    draw.rounded_rectangle([card_x + 80, btn_y, card_x + card_width - 80, btn_y + 80], 
                          15, fill=MAROON)
    bbox = draw.textbbox((0, 0), "Sign In", font=font_small)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, btn_y + 22), "Sign In", fill=GOLD_LIGHT, font=font_small)
    
    # Sign up text
    signup = "Don't have an account? Sign Up"
    bbox = draw.textbbox((0, 0), signup, font=font_small)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, btn_y + 120), signup, fill=TEXT_LIGHT, font=font_small)
    
    # Features section
    features_y = card_y + card_height + 80
    features = [
        ("🍲", "Fresh Daily", "Authentic Gujarati thali"),
        ("📅", "Flexible Plans", "Skip anytime, earn credits"),
        ("🚴", "Fast Delivery", "7:00 - 8:30 PM daily")
    ]
    
    feature_width = 500
    feature_spacing = 60
    start_x = (WIDTH - (3 * feature_width + 2 * feature_spacing)) // 2
    
    for i, (icon, title, desc) in enumerate(features):
        fx = start_x + i * (feature_width + feature_spacing)
        
        # Feature card
        draw.rounded_rectangle([fx, features_y, fx + feature_width, features_y + 180], 
                              20, fill=WHITE)
        
        # Icon
        draw.text((fx + 30, features_y + 30), icon, font=font_large)
        
        # Title
        draw.text((fx + 120, features_y + 40), title, fill=MAROON, font=font_small)
        
        # Description
        bbox = draw.textbbox((0, 0), desc, font=font_small)
        draw.text((fx + 120, features_y + 90), desc, fill=TEXT_LIGHT, font=font_small)
    
    # Bottom text
    bottom_text = "~ Since 2024 ~"
    bbox = draw.textbbox((0, 0), bottom_text, font=font_medium)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, HEIGHT - 120), bottom_text, fill=GOLD, font=font_medium)
    
    img.save(os.path.join(OUTPUT_DIR, "ipad_screenshot.png"), 'PNG')
    print(f"✓ Created ipad_screenshot.png ({WIDTH}x{HEIGHT})")

def main():
    print("Creating iPad 13\" Screenshot (2048 x 2732)")
    print("=" * 50)
    create_ipad_screenshot()
    print("\n✅ iPad screenshot ready!")

if __name__ == "__main__":
    main()
