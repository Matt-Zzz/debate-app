from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class UserSchema(BaseModel):
    id: int
    email: str
    name: str
    profileImageUrl: str | None = None
    location: str | None = None
    headline: str | None = None
    bio: str | None = None
    currentLevel: int
    levelName: str
    totalXP: int
    tutorialCompleted: bool
    placementScore: int
    unlockedDifficulties: list[str]
    nextLevel: int | None = None
    nextLevelName: str | None = None
    nextLevelXP: int | None = None
    xpToNextLevel: int = 0
    createdAt: str
    updatedAt: str


class MiniGameSchema(BaseModel):
    id: str
    title: str
    tutorialQuestionCount: int


class TutorialSessionSchema(BaseModel):
    id: int
    userId: int
    questionIds: dict[str, str]
    scores: dict[str, Any]
    totalScore: int | None = None
    assignedLevel: int | None = None
    assignedLevelName: str | None = None
    status: str


class TrainingSessionSchema(BaseModel):
    id: int
    userId: int
    type: str
    earnedXP: int
    result: dict[str, Any]
    createdAt: str


class DebateTopicSchema(BaseModel):
    id: str
    title: str
    difficulty: str
    tag: str | None = None
    description: str | None = None
    allowedLevels: list[int]
    unlocked: bool | None = None


class PvPSessionSchema(BaseModel):
    id: str
    player1Id: int
    player2Id: int | None = None
    topicId: str | None = None
    status: str
    scores: dict[str, Any] | None = None
    winnerId: int | None = None
    result: dict[str, Any] | None = None
