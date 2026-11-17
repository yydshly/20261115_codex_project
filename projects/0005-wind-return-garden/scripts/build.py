"""Build the explicitly authorized Wind Return Garden research publication."""
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]

if __name__ == '__main__':
    subprocess.run([shutil.which('node') or 'node', str(ROOT/'scripts/build.mjs'), '--publication'], check=True)
