from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class RawTopic:
    source: str
    raw_title: str
    summary: str
    url: str
    popularity_score: int


@dataclass(slots=True)
class SuitabilityResult:
    is_debatable: bool
    reason: str
    safety_level: str = "safe"


@dataclass(slots=True)
class DebateDraft:
    topic: str
    motion: str
    pro_position: str
    pro_arguments: list[str] = field(default_factory=list)
    con_position: str = ""
    con_arguments: list[str] = field(default_factory=list)


@dataclass(slots=True)
class TopicClassification:
    category: str
    difficulty: str
    debate_style: str
    reason: str
    recommended_level: str


@dataclass(slots=True)
class HotDebateTopic:
    id: str
    source: str
    raw_title: str
    raw_summary: str
    source_url: str
    title: str
    motion_title: str
    category: str
    difficulty: str
    debate_style: str
    classification_reason: str
    recommended_level: str
    pro_position: str
    pro_arguments: list[str] = field(default_factory=list)
    con_position: str = ""
    con_arguments: list[str] = field(default_factory=list)
    source_urls: list[str] = field(default_factory=list)
    trend_score: int = 0
    status: str = "approved"
    safety_level: str = "safe"
