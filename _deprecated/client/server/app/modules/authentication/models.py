from sqlalchemy import Column, String


class UserAuthentication:
    password = Column(String(256), nullable=False)
