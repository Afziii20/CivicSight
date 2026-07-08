"""
S3 file upload service for CivicSight API.

Security features:
- File extension whitelist (images only)
- MIME type validation
- File size enforcement (10 MB max)
- Filename sanitization
- Presigned URLs for private reads
"""

import os
import uuid
import logging
import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("civicsight.s3")

S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")

s3_client = boto3.client(
    "s3", 
    region_name=AWS_REGION,
    endpoint_url=f"https://s3.{AWS_REGION}.amazonaws.com"
)

# ---------------------------------------------------------------------------
# Upload Security Configuration
# ---------------------------------------------------------------------------

# Only allow image file types
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "heic"}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

# Presigned URL expiration (1 hour)
PRESIGNED_URL_EXPIRY = 3600


# ---------------------------------------------------------------------------
# Validation Helpers
# ---------------------------------------------------------------------------

def _get_safe_extension(filename: str | None) -> str:
    """
    Extract and validate the file extension.
    Returns a lowercase, safe extension or raises HTTPException.
    """
    if not filename or "." not in filename:
        raise HTTPException(
            status_code=400,
            detail=f"File must have an extension. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    extension = filename.rsplit(".", 1)[-1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '.{extension}' is not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    return extension


def _validate_mime_type(content_type: str | None) -> None:
    """Validate that the upload's MIME type matches our whitelist."""
    if not content_type or content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{content_type}'. Allowed: {', '.join(ALLOWED_MIME_TYPES)}",
        )


# ---------------------------------------------------------------------------
# S3 Operations
# ---------------------------------------------------------------------------

async def upload_image_to_s3(file: UploadFile) -> str:
    """
    Upload an image to S3 with full security validation.

    Returns the S3 object key (NOT a public URL — use get_presigned_url()
    to generate time-limited read access).
    """
    # 1. Validate file extension
    extension = _get_safe_extension(file.filename)

    # 2. Validate MIME type
    _validate_mime_type(file.content_type)

    # 3. Read the file with size enforcement
    contents = await file.read()
    file_size = len(contents)

    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({file_size / (1024*1024):.1f} MB). Maximum is {MAX_FILE_SIZE_BYTES / (1024*1024):.0f} MB.",
        )

    # 4. Generate a safe, random filename (never use the user's original filename)
    file_key = f"reports/{uuid.uuid4()}.{extension}"

    if not S3_BUCKET_NAME:
        # Save locally
        local_filename = os.path.basename(file_key)
        local_path = os.path.join("uploads", local_filename)
        with open(local_path, "wb") as f:
            f.write(contents)
        return f"local://reports/{local_filename}"

    # 5. Upload to S3
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=file_key,
            Body=contents,
            ContentType=file.content_type or "image/jpeg",
            # S3 server-side encryption
            ServerSideEncryption="AES256",
        )
    except ClientError as e:
        logger.error("S3 upload failed: %s", e)
        raise HTTPException(status_code=500, detail="File upload failed. Please try again.")

    logger.info("Uploaded %s (%d bytes) to S3", file_key, file_size)

    # Return the S3 URL (bucket should NOT be publicly accessible)
    return f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{file_key}"


def get_presigned_url(s3_key_or_url: str, expiry: int = PRESIGNED_URL_EXPIRY) -> str:
    """
    Generate a time-limited presigned URL for reading an S3 object.
    Use this instead of making the bucket public.
    """
    if not S3_BUCKET_NAME or s3_key_or_url.startswith("local://"):
        filename = s3_key_or_url.split("/")[-1]
        return f"http://localhost:8000/uploads/{filename}"

    # Extract key if it's a full URL
    key = s3_key_or_url
    if "amazonaws.com/" in key:
        key = key.split("amazonaws.com/", 1)[-1]

    try:
        return s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET_NAME, "Key": key},
            ExpiresIn=expiry,
        )
    except ClientError as e:
        logger.error("Failed to generate presigned URL: %s", e)
        return s3_key_or_url
