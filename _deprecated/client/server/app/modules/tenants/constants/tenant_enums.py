from enum import Enum


class OrganizationRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"

    @classmethod
    def values(cls) -> tuple:
        return tuple(role.value for role in cls)


class ProjectRole(str, Enum):
    ADMIN = "admin"
    MAINTAINER = "maintainer"
    EDITOR = "editor"
    VIEWER = "viewer"

    @classmethod
    def values(cls) -> tuple:
        return tuple(role.value for role in cls)
