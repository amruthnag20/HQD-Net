"""
NIH Chest X-ray 14 Streaming Image Downloader.

Downloads ONLY the controlled subset of 2,958 images by extracting each file
individually from the remote ZIP archive using HTTP Range requests.
No full 2.3GB archive is ever downloaded.
"""

import urllib.request
import struct
import zlib
import json
import os
import time
import hashlib
import pandas as pd

KAGGLE_DOWNLOAD_URL = 'https://www.kaggle.com/api/v1/datasets/download/khanfashee/nih-chest-x-ray-14-224x224-resized'
IMAGE_INDEX_PATH = 'data/raw/nih_chest_xray14/image_byte_index.json'
SPLIT_PATHS = [
    'data/splits/nih_cxr14_train.csv',
    'data/splits/nih_cxr14_val.csv',
    'data/splits/nih_cxr14_test.csv',
]
OUTPUT_DIR = 'data/raw/nih_chest_xray14/images'

def extract_image_from_zip(url, local_hdr_offset, compressed_sz, max_retries=3):
    """
    Extract a single deflate-compressed image from the remote ZIP archive
    using an HTTP Range request targeting only that image's bytes.
    Returns raw PNG bytes.
    """
    # Read local file header to determine data offset
    hdr_req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0',
        'Range': 'bytes=' + str(local_hdr_offset) + '-' + str(local_hdr_offset + 512)
    })
    with urllib.request.urlopen(hdr_req) as resp:
        hdr_bytes = resp.read()

    if hdr_bytes[:4] != b'\x50\x4b\x03\x04':
        raise ValueError('Not a local file header at offset ' + str(local_hdr_offset))

    fname_len, extra_len = struct.unpack('<HH', hdr_bytes[26:30])
    data_start = local_hdr_offset + 30 + fname_len + extra_len

    # Download compressed data with a small safety margin
    fetch_end = data_start + compressed_sz + 256

    for attempt in range(max_retries):
        try:
            data_req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0',
                'Range': 'bytes=' + str(data_start) + '-' + str(fetch_end)
            })
            with urllib.request.urlopen(data_req) as resp:
                compressed_data = resp.read()

            # Deflate decompress
            decompressor = zlib.decompressobj(-15)
            raw_bytes = decompressor.decompress(compressed_data[:compressed_sz])
            return raw_bytes
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise

def stream_download_subset():
    print('=== NIH Chest X-ray 14 — Streaming Subset Downloader ===')
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Load image byte index
    with open(IMAGE_INDEX_PATH) as f:
        image_index = json.load(f)
    print(f'Image index loaded: {len(image_index)} indexed images')

    # Collect all images in the controlled subset
    all_subset_images = set()
    for sp in SPLIT_PATHS:
        df = pd.read_csv(sp)
        all_subset_images.update(df['image_id'].tolist())

    print(f'Controlled subset: {len(all_subset_images)} images to download')

    # Verify all are indexed
    missing = all_subset_images - set(image_index.keys())
    if missing:
        print(f'WARNING: {len(missing)} images not found in index.')
        all_subset_images -= missing

    downloaded = 0
    skipped = 0
    errors = 0
    manifest_rows = []

    for img_name in sorted(all_subset_images):
        out_path = os.path.join(OUTPUT_DIR, img_name)
        if os.path.exists(out_path):
            skipped += 1
            manifest_rows.append({'image_id': img_name, 'status': 'cached', 'path': out_path})
            continue

        local_hdr_offset, compressed_sz, uncompressed_sz = image_index[img_name]
        try:
            raw_bytes = extract_image_from_zip(KAGGLE_DOWNLOAD_URL, local_hdr_offset, compressed_sz)
            with open(out_path, 'wb') as f:
                f.write(raw_bytes)
            downloaded += 1
            manifest_rows.append({'image_id': img_name, 'status': 'downloaded', 'path': out_path})
            if downloaded % 50 == 0:
                print(f'  Downloaded {downloaded} images so far...')
        except Exception as e:
            errors += 1
            print(f'  ERROR downloading {img_name}: {e}')
            manifest_rows.append({'image_id': img_name, 'status': 'error', 'path': None})

    print(f'Done. Downloaded: {downloaded}, Cached: {skipped}, Errors: {errors}')

    manifest_df = pd.DataFrame(manifest_rows)
    manifest_df.to_csv('data/raw/nih_chest_xray14/download_manifest.csv', index=False)
    print(f'Download manifest saved.')
    return downloaded, errors

if __name__ == '__main__':
    stream_download_subset()
