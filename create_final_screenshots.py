#!/usr/bin/env python3
"""Create App Store screenshots with proper branding"""

from PIL import Image, ImageDraw, ImageFont
import os

OUTPUT_DIR = "/app/appstore_final"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# App Store 6.5" display requirement
WIDTH = 1290
HEIGHT = 2796

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

def draw_rounded_rect(draw, coords, radius, fill):
    """Draw a rounded rectangle"""
    x1, y1, x2, y2 = coords
    draw.rounded_rectangle(coords, radius, fill=fill)

def create_screenshot_1():
    """Login Screen - Welcome"""
    img = Image.new('RGB', (WIDTH, HEIGHT), CREAM)
    draw = ImageDraw.Draw(img)
    
    # Header text
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 56)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", 40)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 32)
    except:
        font_large = font_medium = font_small = ImageFont.load_default()
    
    # Top caption
    caption = "Welcome to The Dabba"
    bbox = draw.textbbox((0, 0), caption, font=font_large)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, 120), caption, fill=MAROON, font=font_large)
    
    # Decorative line
    line_y = 200
    draw.line([(WIDTH//2 - 200, line_y), (WIDTH//2 - 30, line_y)], fill=GOLD, width=3)
    draw.ellipse([(WIDTH//2 - 15, line_y - 10), (WIDTH//2 + 15, line_y + 10)], fill=GOLD)
    draw.line([(WIDTH//2 + 30, line_y), (WIDTH//2 + 200, line_y)], fill=GOLD, width=3)
    
    # Phone frame
    phone_width = 600
    phone_height = 1300
    phone_x = (WIDTH - phone_width) // 2
    phone_y = 300
    
    # Phone shadow
    draw.rounded_rectangle([phone_x + 20, phone_y + 20, phone_x + phone_width + 20, phone_y + phone_height + 20], 
                          50, fill=(0, 0, 0, 30))
    
    # Phone body
    draw.rounded_rectangle([phone_x, phone_y, phone_x + phone_width, phone_y + phone_height], 
                          50, fill=WHITE)
    draw.rounded_rectangle([phone_x + 10, phone_y + 10, phone_x + phone_width - 10, phone_y + phone_height - 10], 
                          45, fill=CREAM)
    
    # Logo circle
    logo_size = 200
    logo_x = WIDTH // 2 - logo_size // 2
    logo_y = phone_y + 150
    
    # Logo gradient effect (simplified)
    for i in range(logo_size // 2, 0, -1):
        ratio = i / (logo_size // 2)
        color = tuple(int(MAROON[j] * ratio + MAROON_DARK[j] * (1 - ratio)) for j in range(3))
        draw.ellipse([logo_x + logo_size//2 - i, logo_y + logo_size//2 - i,
                     logo_x + logo_size//2 + i, logo_y + logo_size//2 + i], fill=color)
    
    # Logo border
    draw.ellipse([logo_x - 5, logo_y - 5, logo_x + logo_size + 5, logo_y + logo_size + 5], 
                outline=GOLD, width=5)
    
    # Logo text "D"
    d_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 100) if os.path.exists("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf") else font_large
    draw.text((logo_x + 65, logo_y + 40), "D", fill=GOLD_LIGHT, font=d_font)
    
    # App name
    app_name = "The Dabba"
    bbox = draw.textbbox((0, 0), app_name, font=font_large)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, logo_y + logo_size + 50), app_name, fill=MAROON, font=font_large)
    
    # Tagline
    tagline = "Gujarati Ghar Ka Swad"
    bbox = draw.textbbox((0, 0), tagline, font=font_medium)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, logo_y + logo_size + 130), tagline, fill=GOLD, font=font_medium)
    
    # Email input
    input_y = logo_y + logo_size + 250
    draw.rounded_rectangle([phone_x + 60, input_y, phone_x + phone_width - 60, input_y + 80], 
                          15, fill=WHITE, outline=(232, 222, 209), width=2)
    draw.text((phone_x + 90, input_y + 22), "Enter your email", fill=TEXT_LIGHT, font=font_small)
    
    # Password input
    input_y += 100
    draw.rounded_rectangle([phone_x + 60, input_y, phone_x + phone_width - 60, input_y + 80], 
                          15, fill=WHITE, outline=(232, 222, 209), width=2)
    draw.text((phone_x + 90, input_y + 22), "Enter your password", fill=TEXT_LIGHT, font=font_small)
    
    # Sign In button
    btn_y = input_y + 120
    draw.rounded_rectangle([phone_x + 60, btn_y, phone_x + phone_width - 60, btn_y + 80], 
                          15, fill=MAROON)
    bbox = draw.textbbox((0, 0), "Sign In", font=font_small)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, btn_y + 22), "Sign In", fill=GOLD_LIGHT, font=font_small)
    
    # Bottom text
    bottom_text = "~ Fresh Homestyle Meals ~"
    bbox = draw.textbbox((0, 0), bottom_text, font=font_medium)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, HEIGHT - 150), bottom_text, fill=GOLD, font=font_medium)
    
    img.save(os.path.join(OUTPUT_DIR, "screenshot_1.png"), 'PNG')
    print("✓ Created screenshot_1.png - Welcome Screen")

def create_screenshot_2():
    """Dashboard - Today's Menu"""
    img = Image.new('RGB', (WIDTH, HEIGHT), CREAM)
    draw = ImageDraw.Draw(img)
    
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 56)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", 40)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 32)
        font_xs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 26)
    except:
        font_large = font_medium = font_small = font_xs = ImageFont.load_default()
    
    # Top caption
    caption = "Fresh Gujarati Meals Daily"
    bbox = draw.textbbox((0, 0), caption, font=font_large)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, 120), caption, fill=MAROON, font=font_large)
    
    # Decorative line
    line_y = 200
    draw.line([(WIDTH//2 - 200, line_y), (WIDTH//2 - 30, line_y)], fill=GOLD, width=3)
    draw.ellipse([(WIDTH//2 - 15, line_y - 10), (WIDTH//2 + 15, line_y + 10)], fill=GOLD)
    draw.line([(WIDTH//2 + 30, line_y), (WIDTH//2 + 200, line_y)], fill=GOLD, width=3)
    
    # Phone frame
    phone_width = 600
    phone_height = 1300
    phone_x = (WIDTH - phone_width) // 2
    phone_y = 300
    
    draw.rounded_rectangle([phone_x, phone_y, phone_x + phone_width, phone_y + phone_height], 
                          50, fill=WHITE)
    draw.rounded_rectangle([phone_x + 10, phone_y + 10, phone_x + phone_width - 10, phone_y + phone_height - 10], 
                          45, fill=CREAM)
    
    # Header inside phone
    header_y = phone_y + 40
    
    # Small logo
    logo_size = 60
    for i in range(logo_size // 2, 0, -1):
        ratio = i / (logo_size // 2)
        color = tuple(int(MAROON[j] * ratio + MAROON_DARK[j] * (1 - ratio)) for j in range(3))
        draw.ellipse([phone_x + 50 + logo_size//2 - i, header_y + logo_size//2 - i,
                     phone_x + 50 + logo_size//2 + i, header_y + logo_size//2 + i], fill=color)
    
    # Greeting
    draw.text((phone_x + 130, header_y + 5), "Namaste, User!", fill=MAROON, font=font_small)
    draw.text((phone_x + 130, header_y + 40), "Aaj ka swadisht bhojan", fill=GOLD, font=font_xs)
    
    # Today's Thali card
    card_y = header_y + 120
    draw.rounded_rectangle([phone_x + 40, card_y, phone_x + phone_width - 40, card_y + 400], 
                          20, fill=WHITE)
    
    # Card header (maroon)
    draw.rounded_rectangle([phone_x + 40, card_y, phone_x + phone_width - 40, card_y + 80], 
                          20, fill=MAROON)
    draw.rectangle([phone_x + 40, card_y + 60, phone_x + phone_width - 40, card_y + 80], fill=MAROON)
    draw.text((phone_x + 70, card_y + 22), "Tonight's Dinner", fill=GOLD_LIGHT, font=font_small)
    
    # Meal name
    draw.text((phone_x + 70, card_y + 110), "Dal Tadka", fill=TEXT_DARK, font=font_medium)
    
    # Description
    desc = "Yellow lentils tempered with\ncumin, garlic and spices"
    draw.text((phone_x + 70, card_y + 170), desc, fill=TEXT_LIGHT, font=font_xs)
    
    # Veg badge
    draw.rounded_rectangle([phone_x + 70, card_y + 280, phone_x + 200, card_y + 320], 
                          10, fill=(232, 245, 233))
    draw.text((phone_x + 95, card_y + 287), "Vegetarian", fill=GREEN, font=font_xs)
    
    # Time
    draw.text((phone_x + 350, card_y + 287), "7:00 - 8:30 PM", fill=TEXT_LIGHT, font=font_xs)
    
    # Decorative footer
    draw.line([(phone_x + 150, card_y + 370), (phone_x + phone_width - 150, card_y + 370)], fill=GOLD, width=1)
    
    # Quick actions
    action_y = card_y + 450
    action_width = 150
    actions = [("📅", "Menu"), ("💰", "Wallet"), ("❓", "Support")]
    
    for i, (icon, label) in enumerate(actions):
        ax = phone_x + 60 + i * 180
        draw.rounded_rectangle([ax, action_y, ax + action_width, action_y + 120], 
                              15, fill=WHITE, outline=(232, 222, 209))
        draw.text((ax + 55, action_y + 20), icon, font=font_medium)
        bbox = draw.textbbox((0, 0), label, font=font_xs)
        text_width = bbox[2] - bbox[0]
        draw.text((ax + (action_width - text_width) // 2, action_y + 80), label, fill=TEXT_DARK, font=font_xs)
    
    # Tab bar
    tab_y = phone_y + phone_height - 100
    draw.rectangle([phone_x + 10, tab_y, phone_x + phone_width - 10, phone_y + phone_height - 10], fill=CREAM)
    tabs = ["Home", "Menu", "Plan", "Wallet", "Profile"]
    tab_width = (phone_width - 20) // 5
    for i, tab in enumerate(tabs):
        tx = phone_x + 10 + i * tab_width
        bbox = draw.textbbox((0, 0), tab, font=font_xs)
        text_width = bbox[2] - bbox[0]
        color = MAROON if i == 0 else TEXT_LIGHT
        draw.text((tx + (tab_width - text_width) // 2, tab_y + 35), tab, fill=color, font=font_xs)
    
    # Bottom text
    bottom_text = "~ Ghar Ka Swad, Roz ~"
    bbox = draw.textbbox((0, 0), bottom_text, font=font_medium)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, HEIGHT - 150), bottom_text, fill=GOLD, font=font_medium)
    
    img.save(os.path.join(OUTPUT_DIR, "screenshot_2.png"), 'PNG')
    print("✓ Created screenshot_2.png - Dashboard Screen")

def create_screenshot_3():
    """Kitchen Portal"""
    img = Image.new('RGB', (WIDTH, HEIGHT), CREAM)
    draw = ImageDraw.Draw(img)
    
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 56)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", 40)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 32)
        font_xs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 26)
        font_num = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
    except:
        font_large = font_medium = font_small = font_xs = font_num = ImageFont.load_default()
    
    # Top caption
    caption = "Easy Kitchen Management"
    bbox = draw.textbbox((0, 0), caption, font=font_large)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, 120), caption, fill=MAROON, font=font_large)
    
    # Decorative line
    line_y = 200
    draw.line([(WIDTH//2 - 200, line_y), (WIDTH//2 - 30, line_y)], fill=GOLD, width=3)
    draw.ellipse([(WIDTH//2 - 15, line_y - 10), (WIDTH//2 + 15, line_y + 10)], fill=GOLD)
    draw.line([(WIDTH//2 + 30, line_y), (WIDTH//2 + 200, line_y)], fill=GOLD, width=3)
    
    # Phone frame
    phone_width = 600
    phone_height = 1300
    phone_x = (WIDTH - phone_width) // 2
    phone_y = 300
    
    draw.rounded_rectangle([phone_x, phone_y, phone_x + phone_width, phone_y + phone_height], 
                          50, fill=WHITE)
    draw.rounded_rectangle([phone_x + 10, phone_y + 10, phone_x + phone_width - 10, phone_y + phone_height - 10], 
                          45, fill=CREAM)
    
    # Header
    header_y = phone_y + 40
    logo_size = 60
    for i in range(logo_size // 2, 0, -1):
        ratio = i / (logo_size // 2)
        color = tuple(int(MAROON[j] * ratio + MAROON_DARK[j] * (1 - ratio)) for j in range(3))
        draw.ellipse([phone_x + 50 + logo_size//2 - i, header_y + logo_size//2 - i,
                     phone_x + 50 + logo_size//2 + i, header_y + logo_size//2 + i], fill=color)
    
    draw.text((phone_x + 130, header_y + 5), "Kitchen Portal", fill=MAROON, font=font_small)
    draw.text((phone_x + 130, header_y + 40), "Manage your Dabba", fill=GOLD, font=font_xs)
    
    # Stats cards
    stats = [
        ("👥", "12", "Customers", (232, 245, 233)),
        ("📦", "8", "Active Plans", (255, 243, 224)),
        ("🍲", "15", "Dishes", (227, 242, 253)),
        ("🚴", "10", "Orders", (252, 228, 236))
    ]
    
    card_y = header_y + 130
    card_size = 240
    for i, (icon, num, label, bg) in enumerate(stats):
        row = i // 2
        col = i % 2
        cx = phone_x + 50 + col * (card_size + 20)
        cy = card_y + row * (card_size // 2 + 60)
        
        draw.rounded_rectangle([cx, cy, cx + card_size, cy + card_size // 2 + 40], 15, fill=bg)
        draw.text((cx + 20, cy + 15), icon, font=font_medium)
        draw.text((cx + card_size // 2 - 20, cy + 15), num, fill=TEXT_DARK, font=font_num)
        draw.text((cx + 20, cy + card_size // 2), label, fill=TEXT_LIGHT, font=font_xs)
    
    # Today's Delivery Status card
    status_y = card_y + 320
    draw.rounded_rectangle([phone_x + 40, status_y, phone_x + phone_width - 40, status_y + 180], 
                          15, fill=WHITE, outline=(232, 222, 209))
    draw.text((phone_x + 70, status_y + 20), "Today's Delivery Status", fill=TEXT_DARK, font=font_small)
    
    # Status dots
    draw.ellipse([phone_x + 150, status_y + 90, phone_x + 170, status_y + 110], fill=GREEN)
    draw.text((phone_x + 120, status_y + 120), "Completed", fill=TEXT_LIGHT, font=font_xs)
    draw.text((phone_x + 150, status_y + 70), "5", fill=TEXT_DARK, font=font_num)
    
    draw.ellipse([phone_x + 380, status_y + 90, phone_x + 400, status_y + 110], fill=(230, 81, 0))
    draw.text((phone_x + 360, status_y + 120), "Pending", fill=TEXT_LIGHT, font=font_xs)
    draw.text((phone_x + 380, status_y + 70), "3", fill=TEXT_DARK, font=font_num)
    
    # Quick Actions
    action_y = status_y + 210
    actions = [("➕", "Add Dish"), ("📅", "Set Menu"), ("📋", "Orders")]
    action_width = 150
    
    for i, (icon, label) in enumerate(actions):
        ax = phone_x + 60 + i * 175
        draw.rounded_rectangle([ax, action_y, ax + action_width, action_y + 110], 
                              15, fill=WHITE, outline=(232, 222, 209))
        draw.text((ax + 55, action_y + 15), icon, font=font_medium)
        bbox = draw.textbbox((0, 0), label, font=font_xs)
        text_width = bbox[2] - bbox[0]
        draw.text((ax + (action_width - text_width) // 2, action_y + 70), label, fill=TEXT_DARK, font=font_xs)
    
    # Tab bar
    tab_y = phone_y + phone_height - 100
    draw.rectangle([phone_x + 10, tab_y, phone_x + phone_width - 10, phone_y + phone_height - 10], fill=CREAM)
    tabs = ["Dashboard", "Dishes", "Menu", "Orders", "Users"]
    tab_width = (phone_width - 20) // 5
    for i, tab in enumerate(tabs):
        tx = phone_x + 10 + i * tab_width
        bbox = draw.textbbox((0, 0), tab, font=font_xs)
        text_width = bbox[2] - bbox[0]
        color = MAROON if i == 0 else TEXT_LIGHT
        draw.text((tx + (tab_width - text_width) // 2, tab_y + 35), tab, fill=color, font=font_xs)
    
    # Bottom text
    bottom_text = "~ Kitchen Admin Portal ~"
    bbox = draw.textbbox((0, 0), bottom_text, font=font_medium)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, HEIGHT - 150), bottom_text, fill=GOLD, font=font_medium)
    
    img.save(os.path.join(OUTPUT_DIR, "screenshot_3.png"), 'PNG')
    print("✓ Created screenshot_3.png - Kitchen Portal")

def main():
    print("Creating App Store Screenshots (1290x2796)")
    print("=" * 50)
    create_screenshot_1()
    create_screenshot_2()
    create_screenshot_3()
    print("\n✅ All 3 screenshots ready!")
    print(f"Location: {OUTPUT_DIR}")
    print("\nUpload these to App Store Connect:")
    print("  - screenshot_1.png (Welcome)")
    print("  - screenshot_2.png (Dashboard)")
    print("  - screenshot_3.png (Kitchen)")

if __name__ == "__main__":
    main()
