import os
from PIL import Image, ImageDraw

def create_app_icon():
    size = (256, 256)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background rounded rectangle (Dark slate / graphite)
    margin = 12
    draw.rounded_rectangle([margin, margin, 256 - margin, 256 - margin], radius=40, fill=(35, 39, 47, 255), outline=(255, 255, 255, 60), width=4)

    # Draw Z / Voltage Lightning symbol (matching logo.svg)
    # Z stroke points
    # Polygon background/stroke
    z_points = [
        (140, 50), (125, 75), (70, 75), (70, 50),
        (205, 50), (115, 205), (55, 205), (145, 50)
    ]
    
    # Outer Z polygon
    draw.polygon([(205, 50), (105, 190), (60, 190), (160, 50)], fill=(255, 255, 255, 255))
    # Top horizontal bar
    draw.rounded_rectangle([60, 50, 140, 75], radius=6, fill=(255, 255, 255, 255))
    # Bottom horizontal bar
    draw.rounded_rectangle([115, 165, 195, 190], radius=6, fill=(255, 255, 255, 255))

    return img

def create_start_icon():
    size = (256, 256)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background green circle/rounded rect
    margin = 12
    draw.rounded_rectangle([margin, margin, 256 - margin, 256 - margin], radius=50, fill=(16, 185, 129, 255), outline=(255, 255, 255, 80), width=4)

    # White Play triangle pointing right
    triangle_points = [(95, 70), (185, 128), (95, 186)]
    draw.polygon(triangle_points, fill=(255, 255, 255, 255))

    return img

def create_stop_icon():
    size = (256, 256)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background red rounded rect
    margin = 12
    draw.rounded_rectangle([margin, margin, 256 - margin, 256 - margin], radius=50, fill=(239, 68, 68, 255), outline=(255, 255, 255, 80), width=4)

    # White Stop square
    draw.rounded_rectangle([85, 85, 171, 171], radius=16, fill=(255, 255, 255, 255))

    return img

def main():
    icons_dir = os.path.join(os.path.dirname(__file__), "..", "icons")
    os.makedirs(icons_dir, exist_ok=True)

    sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

    # App icon
    app_img = create_app_icon()
    app_img.save(os.path.join(icons_dir, "app.png"))
    app_img.save(os.path.join(icons_dir, "app.ico"), sizes=sizes)

    # Start icon
    start_img = create_start_icon()
    start_img.save(os.path.join(icons_dir, "start.png"))
    start_img.save(os.path.join(icons_dir, "start.ico"), sizes=sizes)

    # Stop icon
    stop_img = create_stop_icon()
    stop_img.save(os.path.join(icons_dir, "stop.png"))
    stop_img.save(os.path.join(icons_dir, "stop.ico"), sizes=sizes)

    print(f"Iconos generados exitosamente en: {os.path.abspath(icons_dir)}")

if __name__ == "__main__":
    main()
