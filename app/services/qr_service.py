import base64
from datetime import datetime, timedelta, timezone
import io
from fastapi import HTTPException
from jose import JWTError, jwt
import qrcode
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.qr import QRToken
from app.models.user import User, UserRole


def generate_token(patient_id: int) -> tuple[str, datetime]:
    """Generate a signed JWT token valid for 365 days."""
    exp = datetime.now(timezone.utc) + timedelta(days=365)
    payload = {
        "sub": str(patient_id),
        "purpose": "qr",
        "exp": exp,
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return token, exp


def decode_token(token: str) -> int:
    """Verify and decode a QR token returning patient_id."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("purpose") != "qr":
            raise HTTPException(status_code=401, detail="Invalid token purpose")
        patient_id = int(payload.get("sub"))
        return patient_id
    except (JWTError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid or expired QR token")


def generate_qr_image_base64(db: Session, patient_id: int) -> tuple[str, str]:
    """Create token, save QRToken row, generate PNG base64, return (token, image_data_url)."""
    token, exp = generate_token(patient_id)

    qr_token = QRToken(
        patient_id=patient_id,
        token=token,
        is_revoked=False,
        expires_at=exp,
    )
    db.add(qr_token)
    db.commit()

    qr = qrcode.QRCode(box_size=10, border=2)
    qr.add_data(token)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
    data_url = f"data:image/png;base64,{b64_str}"

    return token, data_url


def resolve_token(db: Session, token: str) -> User:
    """Verify JWT, check QRToken exists and not revoked, return User."""
    patient_id = decode_token(token)

    qr_entry = (
        db.query(QRToken)
        .filter(QRToken.token == token, QRToken.patient_id == patient_id, QRToken.is_revoked == False)
        .first()
    )
    if not qr_entry:
        raise HTTPException(status_code=401, detail="QR token revoked or not found")

    user = db.query(User).filter(User.id == patient_id, User.role == UserRole.PATIENT).first()
    if not user:
        raise HTTPException(status_code=404, detail="Patient user not found")

    return user


def revoke_token(db: Session, patient_id: int):
    """Revoke all QR tokens for a patient."""
    tokens = db.query(QRToken).filter(QRToken.patient_id == patient_id, QRToken.is_revoked == False).all()
    for t in tokens:
        t.is_revoked = True
    db.commit()
