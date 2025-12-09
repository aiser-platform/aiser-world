from sqlalchemy import Column, String
from app.common.model import BaseModel
from sqlalchemy.orm import relationship


class Organization(BaseModel):
    __tablename__ = "organizations"

    name = Column(String, nullable=False)
    description = Column(String, nullable=True)

    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    website = Column(String, nullable=True)

    # Relationships
    database = relationship(
        "OrganizationDB", uselist=False, back_populates="organization"
    )
    projects = relationship("Project", back_populates="organization")
    users = relationship("OrganizationUser", back_populates="organization")
