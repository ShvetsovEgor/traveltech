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
    def _catalog(*, force_reload: bool = False) -> dict[str, Any]:
        return load_prompts_catalog(force_reload=force_reload)

    @staticmethod
    def _style_cfg(
        section: str,
        style_id: str,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        """Load style config; reload catalog once if cache was stale."""
        catalog = PromptEngine._catalog()
        styles: dict[str, Any] = catalog[section]
        cfg = styles.get(style_id)
        if cfg:
            return catalog, cfg
        catalog = PromptEngine._catalog(force_reload=True)
        styles = catalog[section]
        cfg = styles.get(style_id)
        if not cfg:
            available = ", ".join(sorted(styles))
            if section == "artist_styles":
                raise ValueError(
                    f"Unknown artist style_id: {style_id}. "
                    f"Available: {available}"
                )
            if section == "neurobox_styles":
                raise ValueError(
                    f"Unknown neurobox style_id: {style_id}. "
                    f"Available: {available}"
                )
            raise ValueError(f"Unknown style_id: {style_id}")
        return catalog, cfg

    @staticmethod
    def _map_neurobox_options(cfg: dict[str, Any], options: list[str]) -> list[str]:
        """Resolve UI labels to prompt fragments (flat option_map or option_groups)."""
        option_map: dict[str, str] = cfg.get("option_map", {})
        groups: dict[str, dict[str, str]] = cfg.get("option_groups", {})
        lookup: dict[str, str] = {**option_map}
        for group in groups.values():
            lookup.update(group)
        seen: set[str] = set()
        mapped: list[str] = []
        for label in options:
            fragment = lookup.get(label)
            if fragment and fragment not in seen:
                seen.add(fragment)
                mapped.append(fragment)
        return mapped

    @staticmethod
    def build_artist_prompt(style_id: str, extra_options: list[str] | None = None) -> str:
        catalog, cfg = PromptEngine._style_cfg("artist_styles", style_id)
        parts = [cfg["base"]]
        signature = cfg.get("signature_elements")
        if signature:
            parts.append(signature)
        structure = cfg.get("structure_preserve")
        if structure:
            parts.append(structure)
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
        catalog, cfg = PromptEngine._style_cfg("neurobox_styles", style_id)
        parts = [cfg["base"]]
        if options:
            mapped = PromptEngine._map_neurobox_options(cfg, options)
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
