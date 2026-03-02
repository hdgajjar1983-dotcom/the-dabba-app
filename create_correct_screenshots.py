#!/usr/bin/env python3
"""Create App Store screenshots with CORRECT dimensions (1242x2688)"""

from PIL import Image, ImageDraw, ImageFont
import os

OUTPUT_DIR = "/app/appstore_correct"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# CORRECT App Store 6.5" display requirement
WIDTH = 1242
HEIGHT = 2688

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

def create_screenshot_1():
    """Login Screen - Welcome"""
    img = Image.new('RGB', (WIDTH, HEIGHT), CREAM)
    draw = ImageDraw.Draw(img)
    
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 52)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", 38)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
        font_logo = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 90)
    except:
        font_large = font_medium = font_small = font_logo = ImageFont.load_default()
    
    # Top caption
    caption = "Welcome to The Dabba"
    bbox = draw.textbbox((0, 0), caption, font=font_large)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, 100), caption, fill=MAROON, font=font_large)
    
    # Decorative line
    line_y = 180
    draw.line([(WIDTH//2 - 180, line_y), (WIDTH//2 - 25, line_y)], fill=GOLD, width=3)
    draw.ellipse([(WIDTH//2 - 12, line_y - 8), (WIDTH//2 + 12, line_y + 8)], fill=GOLD)
    draw.line([(WIDTH//2 + 25, line_y), (WIDTH//2 + 180, line_y)], fill=GOLD, width=3)
    
    # Phone frame
    phone_width = 580
    phone_height = 1200
    phone_x = (WIDTH - phone_width) // 2
    phone_y = 280
    
    # Phone shadow
    draw.rounded_rectangle([phone_x + 15, phone_y + 15, phone_x + phone_width + 15, phone_y + phone_height + 15], 
                          45, fill=(200, 200, 200))
    
    # Phone body
    draw.rounded_rectangle([phone_x, phone_y, phone_x + phone_width, phone_y + phone_height], 
                          45, fill=WHITE)
    draw.rounded_rectangle([phone_x + 8, phone_y + 8, phone_x + phone_width - 8, phone_y + phone_height - 8], 
                          40, fill=CREAM)
    
    # Logo circle
    logo_size = 180
    logo_x = WIDTH // 2 - logo_size // 2
    logo_y = phone_y + 130
    
    # Logo gradient
    for i in range(logo_size // 2, 0, -1):
        ratio = i / (logo_size // 2)
        color = tuple(int(MAROON[j] * ratio + MAROON_DARK[j] * (1 - ratio)) for j in range(3))
        draw.ellipse([logo_x + logo_size//2 - i, logo_y + logo_size//2 - i,
                     logo_x + logo_size//2 + i, logo_y + logo_size//2 + i], fill=color)
    
    # Logo border
    draw.ellipse([logo_x - 4, logo_y - 4, logo_x + logo_size + 4, logo_y + logo_size + 4], 
                outline=GOLD, width=4)
    
    # Logo text "D"
    draw.text((logo_x + 58, logo_y + 35), "D", fill=GOLD_LIGHT, font=font_logo)
    
    # App name
    app_name = "The Dabba"
    bbox = draw.textbbox((0, 0), app_name, font=font_large)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, logo_y + logo_size + 40), app_name, fill=MAROON, font=font_large)
    
    # Tagline
    tagline = "Gujarati Ghar Ka Swad"
    bbox = draw.textbbox((0, 0), tagline, font=font_medium)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, logo_y + logo_size + 110), tagline, fill=GOLD, font=font_medium)
    
    # Email input
    input_y = logo_y + logo_size + 220
    draw.rounded_rectangle([phone_x + 50, input_y, phone_x + phone_width - 50, input_y + 70], 
                          12, fill=WHITE, outline=(232, 222, 209), width=2)
    draw.text((phone_x + 80, input_y + 18), "Enter your email", fill=TEXT_LIGHT, font=font_small)
    
    # Password input
    input_y += 90
    draw.rounded_rectangle([phone_x + 50, input_y, phone_x + phone_width - 50, input_y + 70], 
                          12, fill=WHITE, outline=(232, 222, 209), width=2)
    draw.text((phone_x + 80, input_y + 18), "Enter your password", fill=TEXT_LIGHT, font=font_small)
    
    # Sign In button
    btn_y = input_y + 100
    draw.rounded_rectangle([phone_x + 50, btn_y, phone_x + phone_width - 50, btn_y + 70], 
                          12, fill=MAROON)
    bbox = draw.textbbox((0, 0), "Sign In", font=font_small)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, btn_y + 18), "Sign In", fill=GOLD_LIGHT, font=font_small)
    
    # Bottom text
    bottom_text = "~ Fresh Homestyle Meals ~"
    bbox = draw.textbbox((0, 0), bottom_text, font=font_medium)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, HEIGHT - 140), bottom_text, fill=GOLD, font=font_medium)
    
    img.save(os.path.join(OUTPUT_DIR, "screenshot_1.png"), 'PNG')
    print("✓ Created screenshot_1.png (1242x2688)")

def create_screenshot_2():
    """Dashboard - Today's Menu"""
    img = Image.new('RGB', (WIDTH, HEIGHT), CREAM)
    draw = ImageDraw.Draw(img)
    
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 52)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", 38)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
        font_xs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    except:
        font_large = font_medium = font_small = font_xs = ImageFont.load_default()
    
    # Top caption
    caption = "Fresh Gujarati Meals Daily"
    bbox = draw.textbbox((0, 0), caption, font=font_large)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, 100), caption, fill=MAROON, font=font_large)
    
    # Decorative line
    line_y = 180
    draw.line([(WIDTH//2 - 180, line_y), (WIDTH//2 - 25, line_y)], fill=GOLD, width=3)
    draw.ellipse([(WIDTH//2 - 12, line_y - 8), (WIDTH//2 + 12, line_y + 8)], fill=GOLD)
    draw.line([(WIDTH//2 + 25, line_y), (WIDTH//2 + 180, line_y)], fill=GOLD, width=3)
    
    # Phone frame
    phone_width = 580
    phone_height = 1200
    phone_x = (WIDTH - phone_width) // 2
    phone_y = 280
    
    draw.rounded_rectangle([phone_x + 15, phone_y + 15, phone_x + phone_width + 15, phone_y + phone_height + 15], 
                          45, fill=(200, 200, 200))
    draw.rounded_rectangle([phone_x, phone_y, phone_x + phone_width, phone_y + phone_height], 
                          45, fill=WHITE)
    draw.rounded_rectangle([phone_x + 8, phone_y + 8, phone_x + phone_width - 8, phone_y + phone_height - 8], 
                          40, fill=CREAM)
    
    # Header
    header_y = phone_y + 35
    logo_size = 55
    for i in range(logo_size // 2, 0, -1):
        ratio = i / (logo_size // 2)
        color = tuple(int(MAROON[j] * ratio + MAROON_DARK[j] * (1 - ratio)) for j in range(3))
        draw.ellipse([phone_x + 45 + logo_size//2 - i, header_y + logo_size//2 - i,
                     phone_x + 45 + logo_size//2 + i, header_y + logo_size//2 + i], fill=color)
    
    draw.text((phone_x + 115, header_y + 5), "Namaste, User!", fill=MAROON, font=font_small)
    draw.text((phone_x + 115, header_y + 38), "Aaj ka swadisht bhojan", fill=GOLD, font=font_xs)
    
    # Today's Thali card
    card_y = header_y + 100
    draw.rounded_rectangle([phone_x + 35, card_y, phone_x + phone_width - 35, card_y + 380], 
                          18, fill=WHITE)
    
    # Card header
    draw.rounded_rectangle([phone_x + 35, card_y, phone_x + phone_width - 35, card_y + 70], 
                          18, fill=MAROON)
    draw.rectangle([phone_x + 35, card_y + 50, phone_x + phone_width - 35, card_y + 70], fill=MAROON)
    draw.text((phone_x + 60, card_y + 18), "Tonight's Dinner", fill=GOLD_LIGHT, font=font_small)
    
    # Meal name
    draw.text((phone_x + 60, card_y + 95), "Dal Tadka", fill=TEXT_DARK, font=font_medium)
    
    # Description
    draw.text((phone_x + 60, card_y + 150), "Yellow lentils tempered with", fill=TEXT_LIGHT, font=font_xs)
    draw.text((phone_x + 60, card_y + 180), "cumin, garlic and spices", fill=TEXT_LIGHT, font=font_xs)
    
    # Includes
    draw.text((phone_x + 60, card_y + 230), "Includes: Jeera Rice, Papad, Gulab Jamun", fill=TEXT_LIGHT, font=font_xs)
    
    # Veg badge
    draw.rounded_rectangle([phone_x + 60, card_y + 280, phone_x + 180, card_y + 315], 
                          8, fill=(232, 245, 233))
    draw.text((phone_x + 80, card_y + 285), "Vegetarian", fill=GREEN, font=font_xs)
    
    # Time
    draw.text((phone_x + 340, card_y + 285), "7-8:30 PM", fill=TEXT_LIGHT, font=font_xs)
    
    # Decorative
    draw.line([(phone_x + 120, card_y + 355), (phone_x + phone_width - 120, card_y + 355)], fill=GOLD, width=1)
    
    # Quick actions
    action_y = card_y + 420
    action_width = 145
    actions = [("📅", "Menu"), ("💰", "Wallet"), ("❓", "Help")]
    
    for i, (icon, label) in enumerate(actions):
        ax = phone_x + 50 + i * 168
        draw.rounded_rectangle([ax, action_y, ax + action_width, action_y + 105], 
                              12, fill=WHITE, outline=(232, 222, 209))
        draw.text((ax + 52, action_y + 15), icon, font=font_medium)
        bbox = draw.textbbox((0, 0), label, font=font_xs)
        text_width = bbox[2] - bbox[0]
        draw.text((ax + (action_width - text_width) // 2, action_y + 70), label, fill=TEXT_DARK, font=font_xs)
    
    # Tab bar
    tab_y = phone_y + phone_height - 90
    draw.rectangle([phone_x + 8, tab_y, phone_x + phone_width - 8, phone_y + phone_height - 8], fill=CREAM)
    tabs = ["Home", "Menu", "Plan", "Wallet", "Profile"]
    tab_width = (phone_width - 16) // 5
    for i, tab in enumerate(tabs):
        tx = phone_x + 8 + i * tab_width
        bbox = draw.textbbox((0, 0), tab, font=font_xs)
        text_width = bbox[2] - bbox[0]
        color = MAROON if i == 0 else TEXT_LIGHT
        draw.text((tx + (tab_width - text_width) // 2, tab_y + 30), tab, fill=color, font=font_xs)
    
    # Bottom
    bottom_text = "~ Ghar Ka Swad, Roz ~"
    bbox = draw.textbbox((0, 0), bottom_text, font=font_medium)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, HEIGHT - 140), bottom_text, fill=GOLD, font=font_medium)
    
    img.save(os.path.join(OUTPUT_DIR, "screenshot_2.png"), 'PNG')
    print("✓ Created screenshot_2.png (1242x2688)")

def create_screenshot_3():
    """Kitchen Portal"""
    img = Image.new('RGB', (WIDTH, HEIGHT), CREAM)
    draw = ImageDraw.Draw(img)
    
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 52)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", 38)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
        font_xs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
        font_num = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 44)
    except:
        font_large = font_medium = font_small = font_xs = font_num = ImageFont.load_default()
    
    # Top caption
    caption = "Easy Kitchen Management"
    bbox = draw.textbbox((0, 0), caption, font=font_large)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, 100), caption, fill=MAROON, font=font_large)
    
    # Decorative line
    line_y = 180
    draw.line([(WIDTH//2 - 180, line_y), (WIDTH//2 - 25, line_y)], fill=GOLD, width=3)
    draw.ellipse([(WIDTH//2 - 12, line_y - 8), (WIDTH//2 + 12, line_y + 8)], fill=GOLD)
    draw.line([(WIDTH//2 + 25, line_y), (WIDTH//2 + 180, line_y)], fill=GOLD, width=3)
    
    # Phone frame
    phone_width = 580
    phone_height = 1200
    phone_x = (WIDTH - phone_width) // 2
    phone_y = 280
    
    draw.rounded_rectangle([phone_x + 15, phone_y + 15, phone_x + phone_width + 15, phone_y + phone_height + 15], 
                          45, fill=(200, 200, 200))
    draw.rounded_rectangle([phone_x, phone_y, phone_x + phone_width, phone_y + phone_height], 
                          45, fill=WHITE)
    draw.rounded_rectangle([phone_x + 8, phone_y + 8, phone_x + phone_width - 8, phone_y + phone_height - 8], 
                          40, fill=CREAM)
    
    # Header
    header_y = phone_y + 35
    logo_size = 55
    for i in range(logo_size // 2, 0, -1):
        ratio = i / (logo_size // 2)
        color = tuple(int(MAROON[j] * ratio + MAROON_DARK[j] * (1 - ratio)) for j in range(3))
        draw.ellipse([phone_x + 45 + logo_size//2 - i, header_y + logo_size//2 - i,
                     phone_x + 45 + logo_size//2 + i, header_y + logo_size//2 + i], fill=color)
    
    draw.text((phone_x + 115, header_y + 5), "Kitchen Portal", fill=MAROON, font=font_small)
    draw.text((phone_x + 115, header_y + 38), "Manage your Dabba", fill=GOLD, font=font_xs)
    
    # Stats cards
    stats = [
        ("👥", "12", "Customers", (232, 245, 233)),
        ("📦", "8", "Active", (255, 243, 224)),
        ("🍲", "15", "Dishes", (227, 242, 253)),
        ("🚴", "10", "Orders", (252, 228, 236))
    ]
    
    card_y = header_y + 110
    card_w = 230
    card_h = 110
    
    for i, (icon, num, label, bg) in enumerate(stats):
        row = i // 2
        col = i % 2
        cx = phone_x + 45 + col * (card_w + 20)
        cy = card_y + row * (card_h + 15)
        
        draw.rounded_rectangle([cx, cy, cx + card_w, cy + card_h], 12, fill=bg)
        draw.text((cx + 15, cy + 12), icon, font=font_medium)
        draw.text((cx + card_w - 70, cy + 15), num, fill=TEXT_DARK, font=font_num)
        draw.text((cx + 15, cy + 70), label, fill=TEXT_LIGHT, font=font_xs)
    
    # Delivery Status
    status_y = card_y + 270
    draw.rounded_rectangle([phone_x + 35, status_y, phone_x + phone_width - 35, status_y + 160], 
                          12, fill=WHITE, outline=(232, 222, 209))
    draw.text((phone_x + 60, status_y + 15), "Today's Delivery Status", fill=TEXT_DARK, font=font_small)
    
    # Status items
    draw.ellipse([phone_x + 140, status_y + 80, phone_x + 158, status_y + 98], fill=GREEN)
    draw.text((phone_x + 130, status_y + 55), "5", fill=TEXT_DARK, font=font_num)
    draw.text((phone_x + 105, status_y + 105), "Completed", fill=TEXT_LIGHT, font=font_xs)
    
    draw.ellipse([phone_x + 370, status_y + 80, phone_x + 388, status_y + 98], fill=(230, 81, 0))
    draw.text((phone_x + 365, status_y + 55), "3", fill=TEXT_DARK, font=font_num)
    draw.text((phone_x + 350, status_y + 105), "Pending", fill=TEXT_LIGHT, font=font_xs)
    
    # Quick Actions
    action_y = status_y + 190
    actions = [("➕", "Add"), ("📅", "Menu"), ("📋", "Orders")]
    action_width = 145
    
    for i, (icon, label) in enumerate(actions):
        ax = phone_x + 50 + i * 168
        draw.rounded_rectangle([ax, action_y, ax + action_width, action_y + 100], 
                              12, fill=WHITE, outline=(232, 222, 209))
        draw.text((ax + 52, action_y + 12), icon, font=font_medium)
        bbox = draw.textbbox((0, 0), label, font=font_xs)
        text_width = bbox[2] - bbox[0]
        draw.text((ax + (action_width - text_width) // 2, action_y + 65), label, fill=TEXT_DARK, font=font_xs)
    
    # Tab bar
    tab_y = phone_y + phone_height - 90
    draw.rectangle([phone_x + 8, tab_y, phone_x + phone_width - 8, phone_y + phone_height - 8], fill=CREAM)
    tabs = ["Home", "Dishes", "Menu", "Orders", "Users"]
    tab_width = (phone_width - 16) // 5
    for i, tab in enumerate(tabs):
        tx = phone_x + 8 + i * tab_width
        bbox = draw.textbbox((0, 0), tab, font=font_xs)
        text_width = bbox[2] - bbox[0]
        color = MAROON if i == 0 else TEXT_LIGHT
        draw.text((tx + (tab_width - text_width) // 2, tab_y + 30), tab, fill=color, font=font_xs)
    
    # Bottom
    bottom_text = "~ Kitchen Admin Portal ~"
    bbox = draw.textbbox((0, 0), bottom_text, font=font_medium)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, HEIGHT - 140), bottom_text, fill=GOLD, font=font_medium)
    
    img.save(os.path.join(OUTPUT_DIR, "screenshot_3.png"), 'PNG')
    print("✓ Created screenshot_3.png (1242x2688)")

def main():
    print("=" * 55)
    print("Creating App Store Screenshots")
    print("Dimensions: 1242 x 2688 (iPhone 6.5\" display)")
    print("=" * 55)
    create_screenshot_1()
    create_screenshot_2()
    create_screenshot_3()
    print("\n✅ All 3 screenshots ready!")
    print(f"Location: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
