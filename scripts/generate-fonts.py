"""Optional asset authoring step. Requires fontTools; app runtime has no Python dependency."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parent.parent
for weight in (400, 600, 700, 800):
    font = TTFont(root / "design/sources/fonts/manrope-variable.ttf")
    static = instantiateVariableFont(font, {"wght": weight}, inplace=False, updateFontNames=True)
    static.flavor = "woff"
    static.save(root / f"assets/fonts/manrope-{weight}.woff")
