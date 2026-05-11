from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

PROJECT_ROOT = Path(__file__).resolve().parents[2]
COMPOSITE_DATASET = PROJECT_ROOT / "dataset" / "NASA_Exoplanet_Composite.csv"


@st.cache_data(show_spinner=False)
def load_composite_dataset(path: Path = COMPOSITE_DATASET) -> pd.DataFrame:
    return pd.read_csv(path)


def main() -> None:
    st.set_page_config(page_title="ExoAtlas", page_icon="*", layout="wide")
    st.title("ExoAtlas")

    if not COMPOSITE_DATASET.exists():
        st.error(f"Dataset not found: {COMPOSITE_DATASET}")
        return

    planets = load_composite_dataset()
    st.metric("Planets", f"{len(planets):,}")

    chart_data = planets.dropna(subset=["disc_year"])
    discoveries = (
        chart_data.groupby(["disc_year", "discoverymethod"], dropna=False)
        .size()
        .reset_index(name="count")
    )

    fig = px.bar(
        discoveries,
        x="disc_year",
        y="count",
        color="discoverymethod",
        labels={
            "disc_year": "Discovery year",
            "count": "Planets discovered",
            "discoverymethod": "Discovery method",
        },
    )
    st.plotly_chart(fig, use_container_width=True)

    scatter_data = planets.dropna(subset=["pl_orbper", "pl_rade"])
    fig = px.scatter(
        scatter_data,
        x="pl_orbper",
        y="pl_rade",
        color="discoverymethod",
        hover_name="pl_name",
        hover_data=["hostname", "disc_year", "pl_bmasse", "st_teff", "sy_dist"],
        log_x=True,
        log_y=True,
        labels={
            "pl_orbper": "Orbital period (days)",
            "pl_rade": "Planet radius (Earth radii)",
            "discoverymethod": "Discovery method",
        },
    )
    st.plotly_chart(fig, use_container_width=True)


if __name__ == "__main__":
    main()
