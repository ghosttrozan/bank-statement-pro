from PIL import Image, ImageChops
import numpy as np

im_gen = Image.open('bank-statement-generator/scripts/boi_assets/generated_p1.png').convert('RGB')
im_ref = Image.open('bank-statement-generator/scripts/boi_assets/original_p1.png').convert('RGB')

print("Gen size:", im_gen.size)
print("Ref size:", im_ref.size)

# Crop customer details box from both
# Box is y: 155 to 225 pt -> in px at 150 dpi (factor = 150 / 72 = 2.0833)
# y0 = 155 * 2.0833 = 323, y1 = 225 * 2.0833 = 469
# x0 = 60 * 2.0833 = 125, x1 = 535 * 2.0833 = 1115
crop_area = (int(60 * 150/72), int(150 * 150/72), int(535 * 150/72), int(225 * 150/72))
im_gen.crop(crop_area).save('bank-statement-generator/scripts/boi_assets/cust_gen.png')
im_ref.crop(crop_area).save('bank-statement-generator/scripts/boi_assets/cust_ref.png')

# Crop table header from both
# y: 240 to 270 pt -> y0 = 240 * 2.0833 = 500, y1 = 270 * 2.0833 = 562
crop_header = (int(60 * 150/72), int(240 * 150/72), int(535 * 150/72), int(270 * 150/72))
im_gen.crop(crop_header).save('bank-statement-generator/scripts/boi_assets/header_gen.png')
im_ref.crop(crop_header).save('bank-statement-generator/scripts/boi_assets/header_ref.png')

print("Saved crop images for visual comparison.")

