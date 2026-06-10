from dataclasses import dataclass, field
from typing import List, Literal, Optional

BenchmarkSource = Literal["sebi_tier1", "underlying_index", "fallback", "unresolved"]


@dataclass(frozen=True)
class BenchmarkComponent:
    code: str
    weight: float
    label: str


@dataclass
class BenchmarkResolution:
    components: List[BenchmarkComponent]
    benchmark_name: Optional[str]
    sebi_category: str
    sub_category: str
    benchmark_source: BenchmarkSource
    used_fallback_classifier: bool = False
    index_key: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
