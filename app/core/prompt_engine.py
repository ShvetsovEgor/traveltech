"""
Prompt Engine: [Базовый стиль] + [Опции из интерфейса] + [Технические параметры].

Тексты промптов редактируются в prompts/prompts.json (или путь из PROMPTS_FILE).
"""

from __future__ import annotations

from typing import Any

from app.core.prompt_loader import load_prompts_catalog
from app.models.enums import AppType


class PromptEngine:
    """Assembles prompts: base style + UI options + technical suffix."""

    @staticmethod
    def _catalog() -> dict[str, Any]:
        return load_prompts_catalog()

    @staticmethod
    def build_artist_prompt(style_id: str, extra_options: list[str] | None = None) -> str:
        catalog = PromptEngine._catalog()
        styles = catalog["artist_styles"]
        cfg = styles.get(style_id)
        if not cfg:
            raise ValueError(f"Unknown artist style_id: {style_id}")
        parts = [cfg["base"]]
        if extra_options:
            parts.append(", ".join(extra_options))
        parts.append(catalog["technical"]["image"])
        return " ".join(parts)

    @staticmethod
    def build_neurobox_prompt(
        style_id: str,
        options: list[str] | None = None,
        gender: str | None = None,
    ) -> str:
        catalog = PromptEngine._catalog()
        styles = catalog["neurobox_styles"]
        cfg = styles.get(style_id)
        if not cfg:
            raise ValueError(f"Unknown neurobox style_id: {style_id}")
        parts = [cfg["base"]]
        option_map: dict[str, str] = cfg.get("option_map", {})
        if options:
            mapped = [option_map[o] for o in options if o in option_map]
            if mapped:
                parts.append(", ".join(mapped))
        gender_prompts: dict[str, str] = catalog["gender"]
        if gender and gender in gender_prompts:
            parts.append(gender_prompts[gender])
        parts.append(catalog["technical"]["portrait"])
        return " ".join(parts)

    @staticmethod
    def build_video_prompt(
        scenario_id: str,
        options: list[str] | None = None,
    ) -> str:
        catalog = PromptEngine._catalog()
        scenarios = catalog["video_scenarios"]
        cfg = scenarios.get(scenario_id)
        if not cfg:
            raise ValueError(f"Unknown video scenario_id: {scenario_id}")
        technical = catalog["technical"]
        parts = [technical["face_lock_tag"], cfg["base"]]
        option_map: dict[str, str] = cfg.get("option_map", {})
        if options:
            mapped = [option_map[o] for o in options if o in option_map]
            if mapped:
                parts.append(", ".join(mapped))
        parts.append(technical["portrait"])
        parts.append(technical["video"])
        return " ".join(parts)

    @classmethod
    def build(
        cls,
        app_type: AppType,
        *,
        style_id: str | None = None,
        scenario_id: str | None = None,
        options: list[str] | None = None,
        gender: str | None = None,
    ) -> str:
        if app_type == AppType.NEURO_ARTIST:
            if not style_id:
                raise ValueError("style_id is required for neuro_artist")
            return cls.build_artist_prompt(style_id, options)
        if app_type == AppType.NEUROBOX:
            if not style_id:
                raise ValueError("style_id is required for neurobox")
            return cls.build_neurobox_prompt(style_id, options, gender)
        if app_type == AppType.VIDEO_MAGIC:
            if not scenario_id:
                raise ValueError("scenario_id is required for video_magic")
            return cls.build_video_prompt(scenario_id, options)
        raise ValueError(f"Unsupported app_type: {app_type}")
